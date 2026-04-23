# Como ejecutar el proyecto

Estas instrucciones sirven para levantar el frontend y el backend en una PC nueva.

## Requisitos previos

- Tener instalado `Node.js` (incluye `npm`).
- Tener instalado `Python 3.11` o compatible.
- Usar una terminal en la carpeta raiz del proyecto.

## Paso 1: abrir el proyecto en una terminal

Ubicate en la carpeta donde descargaste el proyecto:

```powershell
cd ruta\de\la\carpeta\CalculadoraAN
```

## Paso 2: instalar dependencias del frontend

```powershell
cd frontend
npm install
```

## Paso 3: instalar dependencias del backend

Abrí otra terminal en la carpeta raiz del proyecto y ejecutá:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Si PowerShell no te deja activar el entorno virtual, podés usar:

```powershell
.\venv\Scripts\activate.bat
```

## Paso 4: iniciar el backend

Desde la carpeta `backend`, con el entorno virtual activado:

```powershell
uvicorn app.main:app --reload
```

El backend va a quedar corriendo en:

```text
http://localhost:8000
```

## Paso 5: iniciar el frontend

En la terminal donde quedó abierta la carpeta `frontend`, ejecutá:

```powershell
npm run dev
```

El frontend normalmente va a abrir en algo similar a:

```text
http://localhost:5173
```

## Paso 6: usar la app

- Abrí en el navegador la URL que muestre Vite.
- Verificá que el backend siga corriendo en `http://localhost:8000`.
- La app del frontend ya está preparada para conectarse a ese backend local.

## Opcional: función de foto con IA

La función para subir una imagen y extraer la ecuación puede usar Gemini o OCR local.

### Opcion A: usar Gemini

Creá un archivo `backend/.env` con una de estas variables:

```env
GEMINI_API_KEY=tu_api_key
```

o

```env
GOOGLE_API_KEY=tu_api_key
```

### Opcion B: usar OCR local

Si no usás Gemini, instalá Tesseract OCR.

Si hace falta indicar la ruta manualmente, agregá esto en `backend/.env`:

```env
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```

## Resumen rapido

Terminal 1:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Terminal 2:

```powershell
cd frontend
npm install
npm run dev
```
