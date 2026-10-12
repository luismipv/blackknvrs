#!/usr/bin/env python3
"""
BLACK KNVRS // WhatsApp Task Extraction Bridge
Micro-servicio local para analizar mensajes del grupo de WhatsApp y sugerir tareas al Portal.
Solo corre en 127.0.0.1 y lee SQLite en modo solo lectura (mode=ro).
"""

import http.server
import json
import sqlite3
import datetime
import os
import sys
import urllib.request
import urllib.error

PORT = 5005
DB_PATH = os.path.expanduser('~/Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite')
GROUP_NAME = 'BLACK KNVRS ⭑'
APPLE_EPOCH = datetime.datetime(2001, 1, 1, tzinfo=datetime.timezone.utc)

def get_env_key():
    key = os.environ.get('GEMINI_API_KEY')
    if key:
        return key.strip()
    env_file = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_file):
        try:
            with open(env_file, 'r') as f:
                for line in f:
                    if line.startswith('GEMINI_API_KEY='):
                        return line.split('=', 1)[1].strip().strip('"').strip("'")
        except Exception:
            pass
    return None

def find_chat_session():
    if not os.path.exists(DB_PATH):
        return None
    try:
        conn = sqlite3.connect(f'file:{DB_PATH}?mode=ro', uri=True)
        c = conn.cursor()
        c.execute("SELECT Z_PK FROM ZWACHATSESSION WHERE ZPARTNERNAME LIKE '%KNVRS%' LIMIT 1;")
        row = c.fetchone()
        conn.close()
        return row[0] if row else None
    except Exception as e:
        print(f"[Error buscando sesión]: {e}")
        return None

def fetch_messages_range(session_id, start_date_str, end_date_str):
    """
    start_date_str: 'YYYY-MM-DD'
    end_date_str: 'YYYY-MM-DD'
    """
    try:
        s_parts = [int(p) for p in start_date_str.split('-')]
        e_parts = [int(p) for p in end_date_str.split('-')]
        start_dt = datetime.datetime(s_parts[0], s_parts[1], s_parts[2], 0, 0, 0, tzinfo=datetime.timezone.utc)
        end_dt = datetime.datetime(e_parts[0], e_parts[1], e_parts[2], 23, 59, 59, tzinfo=datetime.timezone.utc)

        start_ts = (start_dt - APPLE_EPOCH).total_seconds()
        end_ts = (end_dt - APPLE_EPOCH).total_seconds()

        conn = sqlite3.connect(f'file:{DB_PATH}?mode=ro', uri=True)
        c = conn.cursor()
        query = '''
            SELECT m.ZMESSAGEDATE, m.ZISFROMME, p.ZPUSHNAME, m.ZTEXT
            FROM ZWAMESSAGE m
            LEFT JOIN ZWAGROUPMEMBER gm ON m.ZGROUPMEMBER = gm.Z_PK
            LEFT JOIN ZWAPROFILEPUSHNAME p ON gm.ZMEMBERJID = p.ZJID
            WHERE m.ZCHATSESSION = ?
              AND m.ZMESSAGEDATE >= ?
              AND m.ZMESSAGEDATE <= ?
              AND m.ZTEXT IS NOT NULL
              AND trim(m.ZTEXT) != ''
            ORDER BY m.ZMESSAGEDATE ASC;
        '''
        c.execute(query, (session_id, start_ts, end_ts))
        rows = c.fetchall()
        conn.close()

        formatted = []
        name_cleaner = {
            'Darktone': 'Kar (Guitarra)',
            'Adriannnn': 'Adri (Bajo)',
            'Pillo💖': 'Pía / Valeria (Voz)',
            'Maff': 'Maff (Batería)',
            'Daniela': 'Dani (Guitarra)',
            'Edgar Valerio': 'Edgar / Mäsh (World Builder & Arte)',
            'Inti Pavel Guerra': 'Pavel Guerra (Video Producer)',
            'Meta AI': 'Meta AI'
        }

        for r in rows:
            ts, is_me, raw_push, text = r
            dt = APPLE_EPOCH + datetime.timedelta(seconds=ts)
            sender = 'Luis Miguel (Manager)' if is_me == 1 else (raw_push or 'Integrante')
            sender = name_cleaner.get(sender, sender)

            # Skip Meta AI spam or system noise
            if 'Meta AI' in sender or '@bot' in str(sender):
                continue
            if text.startswith('{') and 'should_use_identi' in text:
                continue

            formatted.append({
                'date': dt.strftime('%Y-%m-%d %H:%M'),
                'sender': sender,
                'text': text.strip()
            })

        return formatted
    except Exception as e:
        print(f"[Error leyendo mensajes]: {e}")
        return []

def analyze_with_gemini(messages, api_key):
    if not messages:
        return []

    convo_text = "\n".join([f"[{m['date']}] {m['sender']}: {m['text']}" for m in messages])

    prompt = f"""Eres el Asistente Ejecutivo del proyecto musical BLACK KNVRS (Banda mexicana de Pop Rock / Alt Rock).
Tu trabajo es analizar la siguiente conversación del grupo de WhatsApp oficial de la banda y extraer ÚNICAMENTE compromisos reales, entregables, asignaciones y tareas operativas acordadas.

INTEGRANTES Y ROLES:
- Luis Miguel (id: luis): Manager / Productor Ejecutivo
- Pavel Guerra (id: pavel): Video Producer / Audiovisual
- Edgar Valerio / Mäsh (id: edgar): World Builder / Dirección de Arte & Vestuario
- Steph (id: steph): Assistant Manager / Logística
- Valeria / Pía (id: pia): Cantante / Voz principal
- Adrianne / Adri (id: adri): Bajista
- Kar (id: kar): Guitarrista rítmica
- Maff (id: maff): Baterista / Tesorería 'La Caja'
- Dani (id: dani): Guitarrista líder / Backline
- Toda la banda: (id: all)
- Todo el equipo (Banda + Crew): (id: team)

REGLAS DE EXTRACCIÓN:
1. Filtra y descarta completamente bromas, risas, stickers, saludos y plática casual.
2. Extrae únicamente tareas donde alguien se haya comprometido a algo, donde se haya pedido un entregable o donde haya un acuerdo claro (ej: enviar documentos, cotizar, definir looks, conseguir utilería, ensayar, etc.).
3. Para cada tarea define:
   - title: Título claro y profesional de la tarea.
   - description: Qué se tiene que hacer específicamente.
   - assignedTo: Uno de los siguientes IDs exactos: 'luis', 'pavel', 'edgar', 'steph', 'pia', 'adri', 'kar', 'maff', 'dani', 'all', o 'team'.
   - dueDate: Fecha límite tentativa en formato 'YYYY-MM-DD' (si no se menciona una fecha exacta, sugiere una fecha lógica razonable).
   - priority: 'Crítica', 'Alta', 'Media', o 'Baja'.
   - category: 'Videoclip', 'Visual', 'Producción', 'Composición', 'Show', 'Redes', 'Legal', o 'Lore'.
   - quote: Breve fragmento del chat donde se acordó.

Devuelve EXCLUSIVAMENTE un arreglo JSON válido con las tareas:
[
  {{
    "title": "...",
    "description": "...",
    "assignedTo": "...",
    "dueDate": "YYYY-MM-DD",
    "priority": "Alta",
    "category": "Videoclip",
    "quote": "..."
  }}
]

CONVERSACIÓN DE WHATSAPP:
{convo_text}
"""

def get_available_models(api_key):
    """Consulta la API de Google para descubrir qué modelos soporta exactamente esta API Key."""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        req = urllib.request.Request(url, method='GET')
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            models = data.get('models', [])
            gen_models = []
            for m in models:
                methods = m.get('supportedGenerationMethods', [])
                if 'generateContent' in methods:
                    name = m.get('name', '').replace('models/', '')
                    gen_models.append(name)
            if gen_models:
                print(f"[Gemini ListModels]: Modelos disponibles para esta llave: {gen_models}")
                return gen_models
    except Exception as e:
        print(f"[Aviso ListModels]: {e}")
    return ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-pro"]

def analyze_with_gemini(messages, api_key):
    if not messages:
        return []

    convo_text = "\n".join([f"[{m['date']}] {m['sender']}: {m['text']}" for m in messages])

    prompt = f"""Eres el Asistente Ejecutivo del proyecto musical BLACK KNVRS (Banda mexicana de Pop Rock / Alt Rock).
Tu trabajo es analizar la siguiente conversación del grupo de WhatsApp oficial de la banda y extraer ÚNICAMENTE compromisos reales, entregables, asignaciones y tareas operativas acordadas.

INTEGRANTES Y ROLES:
- Luis Miguel (id: luis): Manager / Productor Ejecutivo
- Pavel Guerra (id: pavel): Video Producer / Audiovisual
- Edgar Valerio / Mäsh (id: edgar): World Builder / Dirección de Arte & Vestuario
- Steph (id: steph): Assistant Manager / Logística
- Valeria / Pía (id: pia): Cantante / Voz principal
- Adrianne / Adri (id: adri): Bajista
- Kar (id: kar): Guitarrista rítmica
- Maff (id: maff): Baterista / Tesorería 'La Caja'
- Dani (id: dani): Guitarrista líder / Backline
- Toda la banda: (id: all)
- Todo el equipo (Banda + Crew): (id: team)

REGLAS DE EXTRACCIÓN:
1. Filtra y descarta completamente bromas, risas, stickers, saludos y plática casual.
2. Extrae únicamente tareas donde alguien se haya comprometido a algo, donde se haya pedido un entregable o donde haya un acuerdo claro (ej: enviar documentos, cotizar, definir looks, conseguir utilería, ensayar, etc.).
3. Para cada tarea define:
   - title: Título claro y profesional de la tarea.
   - description: Qué se tiene que hacer específicamente.
   - assignedTo: Uno de los siguientes IDs exactos: 'luis', 'pavel', 'edgar', 'steph', 'pia', 'adri', 'kar', 'maff', 'dani', 'all', o 'team'.
   - dueDate: Fecha límite tentativa en formato 'YYYY-MM-DD' (si no se menciona una fecha exacta, sugiere una fecha lógica razonable).
   - priority: 'Crítica', 'Alta', 'Media', o 'Baja'.
   - category: 'Videoclip', 'Visual', 'Producción', 'Composición', 'Show', 'Redes', 'Legal', o 'Lore'.
   - quote: Breve fragmento del chat donde se acordó.

Devuelve EXCLUSIVAMENTE un arreglo JSON válido con las tareas:
[
  {{
    "title": "...",
    "description": "...",
    "assignedTo": "...",
    "dueDate": "YYYY-MM-DD",
    "priority": "Alta",
    "category": "Videoclip",
    "quote": "..."
  }}
]

CONVERSACIÓN DE WHATSAPP:
{convo_text}
"""

    discovered = get_available_models(api_key)
    
    # Ordenar modelos dando prioridad a los flash
    def sort_key(m):
        if '1.5-flash' in m: return 0
        if '2.0-flash' in m: return 1
        if 'flash' in m: return 2
        if '1.5-pro' in m: return 3
        return 4
    
    models_to_try = sorted(discovered, key=sort_key)
    last_error_msg = None

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2
            }
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        try:
            with urllib.request.urlopen(req, timeout=35) as resp:
                res_data = json.loads(resp.read().decode('utf-8'))
                candidates = res_data.get('candidates', [])
                if candidates and 'content' in candidates[0]:
                    parts = candidates[0]['content'].get('parts', [])
                    if parts and 'text' in parts[0]:
                        raw_text = parts[0]['text'].strip()
                        clean_json = raw_text
                        if '```' in clean_json:
                            import re
                            match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', clean_json)
                            if match:
                                clean_json = match.group(1)
                        return json.loads(clean_json.strip())
                return []
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8', errors='ignore')
            try:
                err_json = json.loads(err_body)
                msg = err_json.get('error', {}).get('message', err_body)
            except Exception:
                msg = err_body
            last_error_msg = f"Error {e.code} con modelo {model}: {msg}"
            print(f"[Gemini intento {model}]: {last_error_msg}")
            if e.code == 404:
                continue
            raise Exception(last_error_msg)
        except Exception as e:
            last_error_msg = str(e)
            print(f"[Error genérico {model}]: {last_error_msg}")
            continue

    if last_error_msg:
        raise Exception(last_error_msg)
    return []

class BridgeHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/status':
            session = find_chat_session()
            env_key = get_env_key()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'ok': True,
                'dbExists': os.path.exists(DB_PATH),
                'sessionFound': session is not None,
                'sessionId': session,
                'hasApiKey': bool(env_key)
            }).encode('utf-8'))
        else:
            # Servir la web estática (index.html, app.js, etc.)
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/extract-tasks':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                payload = json.loads(post_data.decode('utf-8'))
            except Exception:
                payload = {}

            start_date = payload.get('startDate')
            end_date = payload.get('endDate')
            api_key = payload.get('apiKey') or get_env_key()

            if not start_date or not end_date:
                today = datetime.date.today().isoformat()
                start_date = start_date or today
                end_date = end_date or today

            session_id = find_chat_session()
            if not session_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': 'No se encontró la sesión del grupo BLACK KNVRS en ChatStorage.sqlite'
                }).encode('utf-8'))
                return

            messages = fetch_messages_range(session_id, start_date, end_date)

            if not api_key:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': 'Se requiere una Gemini API Key (ingrésala en la interfaz o en el archivo .env)',
                    'messageCount': len(messages)
                }).encode('utf-8'))
                return

            try:
                tasks = analyze_with_gemini(messages, api_key)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'success': True,
                    'messageCount': len(messages),
                    'startDate': start_date,
                    'endDate': end_date,
                    'tasks': tasks
                }).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': f'Error al analizar con Gemini: {str(e)}',
                    'messageCount': len(messages)
                }).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run_server():
    server_address = ('127.0.0.1', PORT)
    httpd = http.server.HTTPServer(server_address, BridgeHandler)
    print(f"=====================================================")
    print(f"BLACK KNVRS // WhatsApp AI Assistant Bridge")
    print(f"Servidor activo en: http://127.0.0.1:{PORT}")
    print(f"Solo escucha peticiones locales de tu computadora.")
    print(f"Presiona Ctrl+C para detener.")
    print(f"=====================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido limpiamente.")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
