import sys
import json
import re
import time
import requests
from fake_useragent import UserAgent
from duckduckgo_search import DDGS
from datetime import datetime

import sys
import json
import re
import time
import requests
import random
from fake_useragent import UserAgent
from duckduckgo_search import DDGS
from datetime import datetime

def search_image(query):
    """
    Busca una imagen en DuckDuckGo y retorna la URL de la primera coincidencia.
    Incluye un retry simple y delay aleatorio.
    """
    try:
        time.sleep(random.uniform(0.5, 1.5)) # Delay para evitar rate-limit
        with DDGS() as ddgs:
            results = list(ddgs.images(query, max_results=1))
            if results and len(results) > 0:
                return results[0]['image']
    except Exception as e:
        pass
    return ""

def clean_filename(filename):
    """
    Limpia el nombre del archivo para hacerlo legible y mejor para búsqueda.
    Ej: "curso_de_python-v2.pdf" -> "curso de python v2"
    """
    # Quitar extensión
    name = re.sub(r'\.pdf$', '', filename, flags=re.IGNORECASE)
    # Reemplazar guiones y underscores por espacios
    name = name.replace('_', ' ').replace('-', ' ').replace('.', ' ')
    # Quitar caracteres extraños o duplicados
    name = re.sub(r'\s+', ' ', name).strip()
    return name

def scrape_google_drive(folder_id):
    """
    Scraping avanzado de Google Drive simulando un navegador real.
    Utiliza múltiples heurísticas para encontrar archivos PDF en el JSON ofuscado de Google.
    """
    url = f"https://drive.google.com/drive/folders/{folder_id}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Upgrade-Insecure-Requests": "1"
    }

    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            return {"error": f"Failed to fetch drive page. Status: {response.status_code}"}
        
        response.encoding = 'utf-8'
        html_content = response.text
        
        # 1. Corrección de codificación básica
        try:
           fixed_content = html_content.encode('latin1').decode('utf-8')
           html_content = fixed_content
        except:
           pass

        # 2. Decodificar unicode escapes globales
        try:
            html_content = html_content.encode('utf-8').decode('unicode_escape')
        except:
            pass

        pdfs = []
        unique_ids = set()

        # --- ESTRATEGIAS DE EXTENSION ---
        
        # Regex A: Estructura estricta ["ID", "Name", ... "application/pdf"]
        # Esta es la más confiable si existe.
        # Busca ID (25-45 chars) seguido de Nombre (.pdf)
        patterns = [
            # Patrón 1: ["ID","Nombre.pdf", ...
            r'"([a-zA-Z0-9_-]{25,45})","([^"]+\.pdf)"',
            
            # Patrón 2: ID seguido de una estructura y luego nombre (común en vistas de lista)
            r'"([a-zA-Z0-9_-]{25,45})",\[[^\]]+\],"([^"]+\.pdf)"',
            
            # Patrón 3: Inverso o variantes (Name primero... raro pero posible)
            # Nos centramos en capturar cualquier cosa que parezca un PDF
            r'"([^"]+\.pdf)",[^,]+,"([a-zA-Z0-9_-]{25,45})"'
        ]

        # Aplicar patrones secuenciales
        for pattern in patterns:
            matches = re.finditer(pattern, html_content)
            for m in matches:
                # Determinar cuál grupo es cuál (ID vs Nombre)
                g1, g2 = m.group(1), m.group(2)
                if '.pdf' in g2.lower():
                    fid, fname = g1, g2
                else:
                    fid, fname = g2, g1

                if fid not in unique_ids:
                    unique_ids.add(fid)
                    pdfs.append({"id": fid, "name": fname, "drive_id": fid})

        # --- ESTRATEGIA DE RESPALDO (PROXIMIDAD) ---
        # Si tenemos pocos resultados, buscamos menciones de 'application/pdf' y sus vecinos
        if len(pdfs) < 5:
            # Buscar ocurrencias de pdf
            pdf_literals = re.finditer(r'"([^"]+\.pdf)"', html_content, re.IGNORECASE)
            for m in pdf_literals:
                name = m.group(1)
                
                # Contexto anterior 300 chars
                start = max(0, m.start() - 300)
                context = html_content[start:m.start()]
                
                # Buscar ID candidato en el contexto
                # Priorizar IDs que NO sean palabras comunes y tengan mezcla de chars
                id_cand = re.findall(r'([a-zA-Z0-9_-]{28,34})', context)
                
                valid_id = None
                if id_cand:
                    # Tomar el más cercano al nombre (último en la lista)
                    for candid in reversed(id_cand):
                         # Filtros heurísticos: debe tener numeros y letras
                         if re.search(r'\d', candid) and re.search(r'[a-zA-Z]', candid):
                             valid_id = candid
                             break
                
                if valid_id and valid_id not in unique_ids:
                    unique_ids.add(valid_id)
                    pdfs.append({"id": valid_id, "name": name, "drive_id": valid_id})

        # --- POST-PROCESAMIENTO ---
        final_list = []
        for i, p in enumerate(pdfs):
            raw_name = p['name']
            
            # Corrección fina de caracteres (Moji-Bake comunes en español)
            replacements = {
                'Ã¡': 'á', 'Ã©': 'é', 'Ã\xad': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
                'Ã±': 'ñ', 'Ã': 'Ñ', 'â\x80\x93': '-', 'â\x80\x94': '-'
            }
            for bad, good in replacements.items():
                raw_name = raw_name.replace(bad, good)
            
            # Nombre limpio para mostrar (Human Readable)
            display_name = clean_filename(raw_name)
            
            final_list.append({
                "id": f"pdf-{int(time.time() * 1000)}-{i}", 
                "drive_id": p['drive_id'],
                "name": display_name,         # ej: "Clean Code"
                "original_name": raw_name,    # ej: "Clean_Code.pdf"
                "description": "Recuperado automáticamente de Google Drive",
                "url": f"https://drive.google.com/file/d/{p['drive_id']}/view",
                "image_path": "", # Se llenará en el paso siguiente
                "category": "General",
                "tags": ["Auto-Import"]
            })

        return final_list

    except Exception as e:
        return {"error": f"Scraper Exception: {str(e)}"}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No folder ID provided"}))
        sys.exit(1)

    folder_id = sys.argv[1]
    
    # 1. Scrape
    scraped_pdfs = scrape_google_drive(folder_id)
    
    if isinstance(scraped_pdfs, dict) and "error" in scraped_pdfs:
        print(json.dumps(scraped_pdfs))
        sys.exit(1)
        
    final_pdfs = []
    
    # 2. Enriquecimiento
    for pdf in scraped_pdfs:
        # Usar el nombre limpio para buscar la portada es mucho más efectivo
        search_query = f"{pdf['name']} libro portada book cover"
        
        image_url = search_image(search_query)
        pdf['image_path'] = image_url
        
        # Categorización simple
        lower_name = pdf['name'].lower()
        tags = ["Drive"]
        
        if any(x in lower_name for x in ['js', 'javascript', 'node', 'react']):
            pdf['category'] = 'Desarrollo Web'
            tags.append('JavaScript')
        elif any(x in lower_name for x in ['py', 'python', 'django', 'flask']):
            pdf['category'] = 'Backend'
            tags.append('Python')
        elif any(x in lower_name for x in ['c++', 'c#', 'java', 'rust']):
            pdf['category'] = 'Programación'
        elif any(x in lower_name for x in ['guia', 'manual', 'tutorial']):
            pdf['category'] = 'Eduación'
            
        pdf['tags'] = tags
        final_pdfs.append(pdf)

    # 3. Output
    output = {
        "title": f"Librería Importada - {datetime.now().strftime('%Y-%m-%d')}",
        "description": f"Colección de {len(final_pdfs)} documentos importados desde Google Drive.",
        "owner": "Usuario",
        "source": "google-drive-automation",
        "visibility": "public",
        "version": "1.0.0",
        "updatedAt": datetime.now().isoformat(),
        "pdfs": final_pdfs
    }

    print(json.dumps(output))

if __name__ == "__main__":
    main()
