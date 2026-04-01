import os
import io
from google import genai  # <-- LA NUEVA LIBRERÍA
from dotenv import load_dotenv
import PIL.Image

# 1. Cargar el archivo secreto .env
load_dotenv()

# 2. Configurar la llave de Google con el nuevo Cliente
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("¡ADVERTENCIA!: No se encontró la clave de Gemini en el archivo .env")

cliente = genai.Client(api_key=api_key)

def extraer_ecuacion_de_imagen(imagen_bytes: bytes):
    try:
        # Convertir los datos crudos a una imagen real
        imagen = PIL.Image.open(io.BytesIO(imagen_bytes))

        # El "Prompt Engineering"
        prompt_estricto = """
        Eres un experto analizador matemático. Tu única tarea es extraer la ecuación de la imagen.
        Reglas ESTRICTAS:
        1. Devuelve SOLO la función principal en formato Python/SymPy.
        2. Usa '**' para potencias (ejemplo: x**2 + 3*x - 4).
        3. Usa 'sqrt()' para raíces cuadradas, 'sin()' para seno, etc.
        4. Si hay un "= 0", ignóralo y devuelve solo la parte izquierda.
        5. tampoco pongas el y= o f(x), solo deja la ecuacion
        6. NO uses formato Markdown (sin asteriscos ni comillas).
        7. NO saludes, NO expliques, SOLO devuelve la fórmula.
        Si la imagen no tiene una ecuación matemática clara, devuelve la palabra: ERROR
        """

        # 3. La nueva forma de llamar al modelo (usando el modelo flash más estable)
        # Usamos el modelo Lite más nuevo que tienes habilitado
        respuesta = cliente.models.generate_content(
            model='gemini-2.5-flash-lite', 
            contents=[prompt_estricto, imagen]
        )
        
        # Limpiar la respuesta
        ecuacion = respuesta.text.strip()

        if "ERROR" in ecuacion.upper():
            return {"exito": False, "mensaje": "La IA no pudo encontrar una ecuación matemática clara en la imagen."}

        return {
            "exito": True,
            "ecuacion": ecuacion
        }

    except Exception as e:
        return {"exito": False, "mensaje": f"Fallo en el servicio de IA: {str(e)}"}