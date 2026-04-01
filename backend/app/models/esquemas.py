#Definimos los contratos, es decir que solo se acepten los tipos de datos correctos

#Pydantic valida los datos para FastAPI. Establece las reglas para las peticiones
from pydantic import BaseModel, Field

#BaseModel hace que la clase no sea una clase normal sino un modelo de datos estrictos

class PeticionBiseccion(BaseModel):
    funcion: str = Field(...,example="x**2-4", description="La funcion matematica en texto")  
    a: float = Field(..., example=1.0, description="Límite izquierdo del intervalo")
    b: float = Field(..., example=3.0, description="Límite derecho del intervalo")
    tolerancia: float = Field(1e-10, description="Nivel de precicision deseado")
    max_iteraciones: int = Field(100, description="Limite de seguridad para evitar bucles")

class PeticionRegulaFalsi(BaseModel):
    funcion: str = Field(..., example="x**3 - x - 2", description="La función matemática en texto")
    a: float = Field(..., example=1.0, description="Límite izquierdo del intervalo")
    b: float = Field(..., example=2.0, description="Límite derecho del intervalo")
    tolerancia: float = Field(1e-10, description="Nivel de precisión deseado")
    max_iteraciones: int = Field(100, description="Límite de seguridad")

class PeticionPuntoFijo(BaseModel):
    funcion_g: str = Field(..., example="sqrt(x + 2)", description="La función g(x) despejada")
    x0: float = Field(..., example=1.0, description="Punto inicial de arranque")
    tolerancia: float = Field(1e-10, description="Nivel de precisión deseado")
    max_iteraciones: int = Field(100, description="Límite de seguridad")

class PeticionNewton(BaseModel): #Los "..." sirven para que sea obligado el envio de ese dato, caso contrario envia un error 422 (Unprocessable Entity) sin tener que programar ese error
    funcion: str = Field(...,example="x**2-4", description="La funcion matematica en texto")
    punto_inicial: float = Field(..., example=3.0, description="El valor x0 donde inicia el metodo")
    tolerancia: float = Field(1e-10, description="Nivel de precicision deseado")
    max_iteraciones: int = Field(100, description="Limite de seguridad para evitar bucles")

class PeticionSecante(BaseModel):
    funcion: str = Field(..., example="x**3 - x - 2", description="La función matemática")
    x0: float = Field(..., example=1.0, description="Primer punto inicial")
    x1: float = Field(..., example=2.0, description="Segundo punto inicial")
    tolerancia: float = Field(1e-10, description="Nivel de precisión deseado")
    max_iteraciones: int = Field(100, description="Límite de seguridad")
