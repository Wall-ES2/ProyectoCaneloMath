import { useState, useEffect, useRef } from 'react';
import { ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine } from 'recharts';

const NUM_A_SUPER = {
  '0': '\u2070',
  '1': '\u00B9',
  '2': '\u00B2',
  '3': '\u00B3',
  '4': '\u2074',
  '5': '\u2075',
  '6': '\u2076',
  '7': '\u2077',
  '8': '\u2078',
  '9': '\u2079'
};
const SUPER_A_NUM = {
  '\u2070': '0',
  '\u00B9': '1',
  '\u00B2': '2',
  '\u00B3': '3',
  '\u2074': '4',
  '\u2075': '5',
  '\u2076': '6',
  '\u2077': '7',
  '\u2078': '8',
  '\u2079': '9'
};
const SUPERSCRIPT_REGEX = /[\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079]+/g;
const TRADUCCIONES_PYTHON = {
  '\u03C0': 'pi',
  '\u222B': 'integrate',
  '\u03A3': 'sum',
  '\u2202': 'diff',
  '\u221E': 'oo',
  '\u221A': 'sqrt'
};

const convertirFuncionAPython = (expresion) => {
  let funcionPython = (expresion || '').replace(SUPERSCRIPT_REGEX, (match) => {
    const num = match.split('').map((char) => SUPER_A_NUM[char]).join('');
    return '**' + num;
  });

  funcionPython = funcionPython.replace(/\^/g, '**');

  for (const [visual, python] of Object.entries(TRADUCCIONES_PYTHON)) {
    funcionPython = funcionPython.split(visual).join(python);
  }

  return funcionPython.replace(/\be\b/g, 'E');
};

const TECLAS = [
  { label: '\u03C0', valor: '\u03C0' }, { label: 'e', valor: 'e' }, { label: 'x', valor: 'x' }, { label: 'y', valor: 'y' }, { label: 'DEL', valor: 'DEL' }, { label: 'AC', valor: 'AC' },
  { label: '\u222B', valor: '\u222B' }, { label: '\u03A3', valor: '\u03A3' }, { label: '\u2202', valor: '\u2202' }, { label: '\u221E', valor: '\u221E' }, { label: '(', valor: '(' }, { label: ')', valor: ')' },
  { label: 'sin', valor: 'sin(' }, { label: 'cos', valor: 'cos(' }, { label: 'tan', valor: 'tan(' }, { label: '\u221A', valor: '\u221A(' },
  { label: 'x^n', valor: 'MODO_POTENCIA' }, { label: '/', valor: '/' },
  { label: '7', valor: '7' }, { label: '8', valor: '8' }, { label: '9', valor: '9' }, { label: 'ln', valor: 'ln(' }, { label: 'log', valor: 'log(' }, { label: '*', valor: '*' },
  { label: '4', valor: '4' }, { label: '5', valor: '5' }, { label: '6', valor: '6' }, { label: '+', valor: '+' }, { label: '-', valor: '-' }, { label: '.', valor: '.' },
  { label: '1', valor: '1' }, { label: '2', valor: '2' }, { label: '3', valor: '3' }, { label: '0', valor: '0' }, { label: 'exp', valor: 'exp(' }, { label: '=', valor: 'calculate' }
];

const INFO_METODOS = {
  biseccion: {
    titulo: 'Bisección',
    resumen: 'Parte un intervalo [a, b] en mitades hasta acercarse a la raíz.',
    cuando: 'Úsalo cuando f(a) y f(b) tienen signos opuestos.'
  },
  regulafalsi: {
    titulo: 'Regula Falsi',
    resumen: 'Usa una recta secante entre (a, f(a)) y (b, f(b)) para estimar la raíz.',
    cuando: 'Úsalo cuando hay cambio de signo y quieres converger más rápido que Bisección.'
  },
  newton: {
    titulo: 'Newton-Raphson',
    resumen: 'Refina la raíz con derivada: x(n+1) = x(n) - f(x)/f\'(x).',
    cuando: 'Úsalo si tienes un buen punto inicial y la derivada no se hace cero.'
  },
  secante: {
    titulo: 'Secante',
    resumen: 'Similar a Newton pero sin derivada explícita; usa dos puntos iniciales.',
    cuando: 'Úsalo cuando no quieres calcular derivadas y tienes x0 y x1 razonables.'
  },
  punto_fijo: {
    titulo: 'Punto Fijo',
    resumen: 'Itera x(n+1) = g(x(n)) hasta estabilizarse.',
    cuando: 'Úsalo solo si g(x) fue bien despejada y converge cerca de la raíz.'
  }
};
function App() {
  const [seccion, setSeccion] = useState('raices'); 
  const [metodo, setMetodo] = useState('biseccion');
  
  const [funcion, setFuncion] = useState('x^2 - 4'); 
  const [limiteA, setLimiteA] = useState('');
  const [limiteB, setLimiteB] = useState('');
  const [puntoX0, setPuntoX0] = useState('');
  const [puntoX1, setPuntoX1] = useState(''); 
  
  const [tolerancia, setTolerancia] = useState('1e-10');
  const [maxIteraciones, setMaxIteraciones] = useState(100);

  const [esPotencia, setEsPotencia] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [errorMensaje, setErrorMensaje] = useState(null); 
  const resultadosRef = useRef(null);

  const [datosGraficoVivo, setDatosGraficoVivo] = useState([]);
  const [puntosIteracion, setPuntosIteracion] = useState([]);
  const [indiceRaizActiva, setIndiceRaizActiva] = useState(0);
  const [dominioX, setDominioX] = useState(null);
  const [dominioYManual, setDominioYManual] = useState(null);
  const [arrastreGrafico, setArrastreGrafico] = useState(null);
  const [modoArrastreGrafico, setModoArrastreGrafico] = useState(false);
  const [pasoActual, setPasoActual] = useState(0);
  const [reproduccionActiva, setReproduccionActiva] = useState(false);

  // --- NUEVOS ESTADOS Y REFS PARA LA IA ---
  const [cargandoIA, setCargandoIA] = useState(false);
  const [cargandoRecomendacion, setCargandoRecomendacion] = useState(false);
  const [recomendacionMetodo, setRecomendacionMetodo] = useState(null);
  const fileInputRef = useRef(null); // Referencia al input oculto de archivos
  const [mostrarInfoMetodos, setMostrarInfoMetodos] = useState(false);
  const [modoOscuro, setModoOscuro] = useState(false);
  const contenedorGraficoRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', modoOscuro);
  }, [modoOscuro]);

  const obtenerRangoBaseX = () => {
    let xMin = -5;
    let xMax = 5;

    if ((metodo === 'biseccion' || metodo === 'regulafalsi') && limiteA !== '' && limiteB !== '') {
      xMin = Math.min(parseFloat(limiteA), parseFloat(limiteB)) - 2;
      xMax = Math.max(parseFloat(limiteA), parseFloat(limiteB)) + 2;
    } else if (puntoX0 !== '') {
      xMin = parseFloat(puntoX0) - 4;
      xMax = parseFloat(puntoX0) + 4;
    }

    return [xMin, xMax];
  };

  // =========================================
  // EL ESCUCHADOR (DIBUJA LA CURVA EN VIVO)
  // =========================================
  useEffect(() => {
    if (!funcion) {
      setDatosGraficoVivo([]);
      setDominioX(null);
      setDominioYManual(null);
      return;
    }

    const [xMin, xMax] = obtenerRangoBaseX();
    setDominioX([xMin, xMax]);
    setDominioYManual(null);
  }, [funcion, limiteA, limiteB, puntoX0, metodo]);

  useEffect(() => {
    try {
      if (!funcion || !dominioX) {
        setDatosGraficoVivo([]);
        return;
      }

      const funcionPython = convertirFuncionAPython(funcion);

      let funcJS = funcionPython
        .replace(/pi/g, 'Math.PI')
        .replace(/\bE\b/g, 'Math.E')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/exp\(/g, 'Math.exp(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/log\(/g, 'Math.log10(');

      const evaluar = new Function('x', `return ${funcJS};`);
      const anchoVisible = Math.max(dominioX[1] - dominioX[0], 1);
      const xMin = dominioX[0] - anchoVisible * 0.35;
      const xMax = dominioX[1] + anchoVisible * 0.35;

      let pts = [];
      let step = (xMax - xMin) / 220;
      for (let x = xMin; x <= xMax; x += step) {
        let y = evaluar(x);
        if (!isNaN(y) && Number.isFinite(y) && Math.abs(y) < 1000) {
          pts.push({ x: Number(x.toFixed(4)), fx: Number(y.toFixed(4)) });
        }
      }
      setDatosGraficoVivo(pts);
    } catch (e) {}
  }, [funcion, dominioX, metodo, limiteA, limiteB, puntoX0]);

  // =========================================
  // MANEJO DE LA INTERFAZ
  // =========================================
  const limpiarResultados = () => {
    setErrorMensaje(null);
    setResultados(null);
    setPuntosIteracion([]);
    setIndiceRaizActiva(0);
    setPasoActual(0);
    setReproduccionActiva(false);
  };

  const limpiarRecomendacion = () => {
    setRecomendacionMetodo(null);
  };

  const obtenerRaizMostrada = (datos) => {
    if (!datos) return null;
    if (Array.isArray(datos.raices) && datos.raices.length > 0) {
      const idx = Math.min(Math.max(indiceRaizActiva, 0), datos.raices.length - 1);
      const candidata = datos.raices[idx];
      if (typeof candidata === 'number' && Number.isFinite(candidata)) return candidata;
    }
    const raizDirecta = datos.raizFinal ?? datos.raiz;
    if (typeof raizDirecta === 'number' && Number.isFinite(raizDirecta)) return raizDirecta;

    const iteraciones = obtenerIteracionesActivas(datos, indiceRaizActiva);
    const ult = iteraciones?.[iteraciones.length - 1];
    if (!ult) return null;

    const raizIter = ult.c ?? ult.xr ?? ult.x2 ?? ult.g_xi ?? ult.xi;
    return typeof raizIter === 'number' && Number.isFinite(raizIter) ? raizIter : null;
  };

  const obtenerRaicesMostradas = (datos) => {
    if (!datos) return [];
    if (Array.isArray(datos.raices) && datos.raices.length > 0) {
      return datos.raices.filter((r) => typeof r === 'number' && Number.isFinite(r));
    }
    const unica = obtenerRaizMostrada(datos);
    return unica !== null ? [unica] : [];
  };

  const obtenerIteracionesActivas = (datos = resultados, idx = indiceRaizActiva) => {
    if (!datos) return [];
    if (Array.isArray(datos.iteraciones_por_raiz) && datos.iteraciones_por_raiz.length > 0) {
      const seguro = Math.min(Math.max(idx, 0), datos.iteraciones_por_raiz.length - 1);
      return Array.isArray(datos.iteraciones_por_raiz[seguro]) ? datos.iteraciones_por_raiz[seguro] : [];
    }
    return Array.isArray(datos.iteraciones) ? datos.iteraciones : [];
  };

  const construirPuntosIteracion = (iteraciones = []) => {
    const puntos = [];
    iteraciones.forEach((it) => {
      const raizIteracion = it.c !== undefined ? it.c : (it.xr !== undefined ? it.xr : (it.x2 !== undefined ? it.x2 : (it.g_xi !== undefined ? it.g_xi : it.xi)));
      const funcionEvaluada = it.f_c !== undefined ? it.f_c : (it.f_xi !== undefined ? it.f_xi : (it.f_x2 !== undefined ? it.f_x2 : 0));
      if (Number.isFinite(raizIteracion) && Number.isFinite(funcionEvaluada)) {
        puntos.push({ x: Number(raizIteracion), fx: Number(funcionEvaluada) });
      }
    });
    return puntos;
  };

  const obtenerMarcadoresRaices = () => {
    return obtenerRaicesMostradas(resultados).map((r) => ({ x: Number(r), fx: 0 }));
  };

  const obtenerDominioYVisible = () => {
    if (dominioYManual) return dominioYManual;

    const puntosBase = datosGraficoVivo.filter((p) => {
      if (!dominioX) return true;
      return p.x >= dominioX[0] && p.x <= dominioX[1];
    });

    const puntosVisibles = [...puntosBase, ...obtenerPuntosIteracionVisibles()];
    if (!puntosVisibles.length) return ['auto', 'auto'];

    const ys = puntosVisibles
      .map((p) => p.fx)
      .filter((valor) => typeof valor === 'number' && Number.isFinite(valor));

    if (!ys.length) return ['auto', 'auto'];

    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const margen = Math.max((maxY - minY) * 0.15, 1);

    return [minY - margen, maxY + margen];
  };

  const ajustarZoom = (factor) => {
    if (!dominioX) return;

    const [minX, maxX] = dominioX;
    const centro = (minX + maxX) / 2;
    const anchoActual = maxX - minX;
    const nuevoAncho = Math.max(anchoActual * factor, 0.5);

    setDominioX([
      Number((centro - nuevoAncho / 2).toFixed(4)),
      Number((centro + nuevoAncho / 2).toFixed(4))
    ]);
  };

  const reiniciarZoom = () => {
    if (!datosGraficoVivo.length) return;

    const xs = datosGraficoVivo.map((p) => p.x);
    setDominioX([Math.min(...xs), Math.max(...xs)]);
    setDominioYManual(null);
  };

  const iniciarArrastreGrafico = (evento) => {
    if (!dominioX || !modoArrastreGrafico) return;

    evento.preventDefault();

    setArrastreGrafico({
      xInicial: evento.clientX,
      yInicial: evento.clientY,
      dominioXInicial: [...dominioX],
      dominioYInicial: [...obtenerDominioYVisible()]
    });
  };

  const moverGraficoArrastrando = (evento) => {
    if (!arrastreGrafico || !contenedorGraficoRef.current) return;

    evento.preventDefault();

    const anchoPx = contenedorGraficoRef.current.clientWidth || 1;
    const altoPx = contenedorGraficoRef.current.clientHeight || 1;
    const deltaPx = evento.clientX - arrastreGrafico.xInicial;
    const deltaYPx = evento.clientY - arrastreGrafico.yInicial;
    const anchoDominio = arrastreGrafico.dominioXInicial[1] - arrastreGrafico.dominioXInicial[0];
    const altoDominio = arrastreGrafico.dominioYInicial[1] - arrastreGrafico.dominioYInicial[0];
    const desplazamientoX = -(deltaPx / anchoPx) * anchoDominio;
    const desplazamientoY = (deltaYPx / altoPx) * altoDominio;

    setDominioX([
      Number((arrastreGrafico.dominioXInicial[0] + desplazamientoX).toFixed(4)),
      Number((arrastreGrafico.dominioXInicial[1] + desplazamientoX).toFixed(4))
    ]);

    setDominioYManual([
      Number((arrastreGrafico.dominioYInicial[0] + desplazamientoY).toFixed(4)),
      Number((arrastreGrafico.dominioYInicial[1] + desplazamientoY).toFixed(4))
    ]);
  };

  const terminarArrastreGrafico = () => {
    setArrastreGrafico(null);
  };

  const crearEvaluadorFuncion = () => {
    try {
      const funcionPython = convertirFuncionAPython(funcion);
      const funcJS = funcionPython
        .replace(/pi/g, 'Math.PI')
        .replace(/\bE\b/g, 'Math.E')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/exp\(/g, 'Math.exp(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/log\(/g, 'Math.log10(');

      return new Function('x', `return ${funcJS};`);
    } catch (e) {
      return null;
    }
  };

  const obtenerPuntosIteracionVisibles = () => {
    const iteraciones = obtenerIteracionesActivas();
    if (!iteraciones.length) return puntosIteracion;
    return puntosIteracion.slice(0, pasoActual + 1);
  };

  const obtenerIteracionActual = () => {
    const iteraciones = obtenerIteracionesActivas();
    if (!iteraciones.length) return null;
    const indice = Math.min(pasoActual, iteraciones.length - 1);
    return iteraciones[indice];
  };

  const obtenerTangenteActual = () => {
    if (metodo !== 'newton') return [];

    const iteracion = obtenerIteracionActual();
    if (!iteracion || typeof iteracion.xi !== 'number' || typeof iteracion.f_xi !== 'number' || typeof iteracion.df_xi !== 'number') {
      return [];
    }

    if (!Number.isFinite(iteracion.df_xi) || iteracion.df_xi === 0) return [];

    const ancho = dominioX ? dominioX[1] - dominioX[0] : 10;
    const delta = Math.max(ancho * 0.18, 1.5);
    const x1 = iteracion.xi - delta;
    const x2 = iteracion.xi + delta;

    return [
      { x: x1, fx: iteracion.f_xi + iteracion.df_xi * (x1 - iteracion.xi) },
      { x: x2, fx: iteracion.f_xi + iteracion.df_xi * (x2 - iteracion.xi) }
    ];
  };

  const obtenerPuntoActual = () => {
    const iteracion = obtenerIteracionActual();
    if (!iteracion) return [];

    if (metodo === 'biseccion' || metodo === 'regulafalsi') {
      if (typeof iteracion.c === 'number' && typeof iteracion.f_c === 'number') {
        return [{ x: iteracion.c, fx: iteracion.f_c }];
      }
      return [];
    }

    if (metodo === 'newton') {
      if (typeof iteracion.xi === 'number' && typeof iteracion.f_xi === 'number') {
        return [{ x: iteracion.xi, fx: iteracion.f_xi }];
      }
      return [];
    }

    if (metodo === 'secante') {
      if (typeof iteracion.x2 === 'number' && typeof iteracion.f_x2 === 'number') {
        return [{ x: iteracion.x2, fx: iteracion.f_x2 }];
      }
      return [];
    }

    if (metodo === 'punto_fijo') {
      if (typeof iteracion.xi === 'number') {
        const evaluar = crearEvaluadorFuncion();
        if (!evaluar) return [];
        const fx = evaluar(iteracion.xi);
        if (Number.isFinite(fx)) return [{ x: iteracion.xi, fx: Number(fx) }];
      }
    }

    return [];
  };

  useEffect(() => {
    const iteraciones = obtenerIteracionesActivas();
    if (!reproduccionActiva || !iteraciones.length) return;
    if (pasoActual >= iteraciones.length - 1) {
      setReproduccionActiva(false);
      return;
    }

    const timer = setTimeout(() => {
      setPasoActual((prev) => prev + 1);
    }, 900);

    return () => clearTimeout(timer);
  }, [reproduccionActiva, pasoActual, resultados, indiceRaizActiva]);

  useEffect(() => {
    const iteraciones = obtenerIteracionesActivas();
    setPuntosIteracion(construirPuntosIteracion(iteraciones));
    setPasoActual(0);
    setReproduccionActiva(false);
  }, [resultados, indiceRaizActiva]);

  const manejarTeclado = (valor) => {
    limpiarResultados();
    limpiarRecomendacion();
    if (valor === 'MODO_POTENCIA') { setEsPotencia(!esPotencia); return; }
    if (valor === 'AC') { setFuncion(''); setEsPotencia(false); } 
    else if (valor === 'DEL') { setFuncion((prev) => prev.slice(0, -1)); } 
    else if (valor === 'calculate') { ejecutarCalculo(); } 
    else {
      if (esPotencia && !isNaN(valor)) { setFuncion((prev) => prev + NUM_A_SUPER[valor]); } 
      else {
        if (isNaN(valor) && valor !== '.') setEsPotencia(false);
        setFuncion((prev) => prev + valor); 
      }
    }
  };

  const manejarInputFisico = (evento) => {
    limpiarResultados();
    limpiarRecomendacion();
    let texto = evento.target.value;
    texto = texto.replace(/\^([0-9])/g, (match, numero) => NUM_A_SUPER[numero]);
    setFuncion(texto);
  };

  // =========================================
  // LA CONEXIN A PYTHON (INTELIGENCIA ARTIFICIAL)
  // =========================================
  const manejarSubidaImagen = async (evento) => {
    const archivo = evento.target.files[0];
    if (!archivo) return;

    limpiarResultados();
    limpiarRecomendacion();
    setCargandoIA(true);

    const formData = new FormData();
    formData.append('file', archivo);

    try {
      const respuesta = await fetch('http://localhost:8000/ia/analizar-foto', {
        method: 'POST',
        body: formData
      });

      let datosIA = null;
      try {
        datosIA = await respuesta.json();
      } catch (e) {
        throw new Error('La respuesta del servidor no fue JSON valido.');
      }

      if (!respuesta.ok) {
        throw new Error(datosIA?.mensaje || `Error HTTP ${respuesta.status}`);
      }

      if (datosIA.exito) {
        let ecuacionLimpia = datosIA.ecuacion.replace(/\*\*([0-9])/g, (match, num) => NUM_A_SUPER[num]);
        setFuncion(ecuacionLimpia);
        if (datosIA.fuente === 'ocr_local') {
          setErrorMensaje('Se uso fallback OCR local porque Gemini no estuvo disponible.');
        }
      } else {
        setErrorMensaje('IA Gemini: ' + datosIA.mensaje);
      }
    } catch (error) {
      setErrorMensaje(error?.message || 'Error de red. FastAPI debe estar encendido en el puerto 8000.');
    } finally {
      setCargandoIA(false);
      evento.target.value = null;
    }
  };

  const recomendarMetodoConIA = async () => {
    limpiarResultados();
    limpiarRecomendacion();

    if (!funcion.trim()) {
      setErrorMensaje("Primero ingresá una ecuación para poder recomendar un método.");
      return;
    }

    setCargandoRecomendacion(true);

    try {
      const respuesta = await fetch('http://localhost:8000/ia/recomendar-metodo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funcion: convertirFuncionAPython(funcion) })
      });

      const datos = await respuesta.json();
      if (!respuesta.ok || datos.exito === false) {
        throw new Error(datos?.mensaje || `Error HTTP ${respuesta.status}`);
      }

      setRecomendacionMetodo(datos);
    } catch (error) {
      setErrorMensaje(error?.message || 'No se pudo obtener una recomendación del método.');
    } finally {
      setCargandoRecomendacion(false);
    }
  };

  const aplicarParametrosSugeridos = () => {
    if (!recomendacionMetodo?.parametros_sugeridos) return;

    const sugeridos = recomendacionMetodo.parametros_sugeridos;
    setMetodo(recomendacionMetodo.metodo);

    if (sugeridos.a !== undefined) setLimiteA(String(sugeridos.a));
    if (sugeridos.b !== undefined) setLimiteB(String(sugeridos.b));
    if (sugeridos.x0 !== undefined) setPuntoX0(String(sugeridos.x0));
    if (sugeridos.x1 !== undefined) setPuntoX1(String(sugeridos.x1));
  };

  // =========================================
  // EJECUCIN DEL CÁLCULO NUMRICO (PYTHON)
  // =========================================
  const ejecutarCalculo = async () => {
    limpiarResultados();
    if (!funcion) { setErrorMensaje("Por favor, ingresa una función matemática primero."); return; }

    setCargando(true);

    const funcionPython = convertirFuncionAPython(funcion);

    const tolParseada = parseFloat(tolerancia) || 1e-10;
    const maxIterParseadas = parseInt(maxIteraciones) || 100;
    
    let urlDestino = '';
    let paqueteDeDatos = {};

    if (metodo === 'biseccion') {
      urlDestino = 'http://localhost:8000/calcular/biseccion';
      paqueteDeDatos = { funcion: funcionPython, a: parseFloat(limiteA), b: parseFloat(limiteB), tolerancia: tolParseada, max_iteraciones: maxIterParseadas };
    } else if (metodo === 'regulafalsi') {
      urlDestino = 'http://localhost:8000/calcular/regulafalsi';
      paqueteDeDatos = { funcion: funcionPython, a: parseFloat(limiteA), b: parseFloat(limiteB), tolerancia: tolParseada, max_iteraciones: maxIterParseadas };
    } else if (metodo === 'newton') {
      urlDestino = 'http://localhost:8000/calcular/newton';
      paqueteDeDatos = { funcion: funcionPython, punto_inicial: parseFloat(puntoX0), tolerancia: tolParseada, max_iteraciones: maxIterParseadas };
    } else if (metodo === 'secante') {
      urlDestino = 'http://localhost:8000/calcular/secante';
      paqueteDeDatos = { funcion: funcionPython, x0: parseFloat(puntoX0), x1: parseFloat(puntoX1), tolerancia: tolParseada, max_iteraciones: maxIterParseadas };
    } else if (metodo === 'punto_fijo') {
      urlDestino = 'http://localhost:8000/calcular/punto-fijo';
      paqueteDeDatos = { funcion_g: funcionPython, x0: parseFloat(puntoX0), tolerancia: tolParseada, max_iteraciones: maxIterParseadas };
    }

    try {
      const respuesta = await fetch(urlDestino, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paqueteDeDatos)
      });
      const datosPython = await respuesta.json();

      if (datosPython.exito === false) {
        setErrorMensaje(datosPython.mensaje);
        setCargando(false);
        return;
      }

      setResultados(datosPython);
      setIndiceRaizActiva(0);
      setPasoActual(0);
      const iteracionesIniciales = Array.isArray(datosPython.iteraciones_por_raiz) && datosPython.iteraciones_por_raiz.length
        ? (datosPython.iteraciones_por_raiz[0] || [])
        : (datosPython.iteraciones || []);
      setReproduccionActiva(iteracionesIniciales.length > 1);

      setTimeout(() => { resultadosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);

    } catch (error) {
      setErrorMensaje("Error de red. Asegúrate de tener tu servidor FastAPI (Python) encendido en el puerto 8000.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-100 selection:text-blue-900">
      
      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-serif italic font-bold text-lg shadow-sm">fx</div>
            <h1 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100">Canelo<span className="text-zinc-400 dark:text-zinc-500 font-normal">Math</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModoOscuro((prev) => !prev)}
              title={modoOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
              className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {modoOscuro ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.95 2.05a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM17 9a1 1 0 110 2h-1a1 1 0 110-2h1zM5 10a5 5 0 1110 0A5 5 0 015 10zm1.636 5.243a1 1 0 10-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM4 9a1 1 0 100 2H3a1 1 0 100-2h1zm1.636-4.95a1 1 0 10-1.414 1.414l.707.707A1 1 0 006.343 4.95l-.707-.707z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707 8.002 8.002 0 1017.293 13.293z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setMostrarInfoMetodos(true)}
              className="text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm font-medium transition-colors"
            >
              Info Métodos
            </button>
          </div>
        </div>
      </header>

      {mostrarInfoMetodos && (
        <div className="fixed inset-0 z-[60] bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-2xl">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Información de métodos</h3>
              <button
                onClick={() => setMostrarInfoMetodos(false)}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cerrar
              </button>
            </div>
            <div className="p-6 grid gap-3">
              {Object.entries(INFO_METODOS).map(([clave, info]) => (
                <div
                  key={clave}
                  className={`rounded-xl border p-4 ${metodo === clave ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800' : 'border-zinc-200 bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{info.titulo}</h4>
                    {metodo === clave && (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-blue-600 text-white font-semibold uppercase tracking-wide">
                        Activo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-200">{info.resumen}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1"><span className="font-semibold">Cuándo usarlo:</span> {info.cuando}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-10">
        
        {/* MEN LATERAL */}
        <aside className="w-full lg:w-64 shrink-0 space-y-8">
          <div>
            <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4 pl-2">Raíces de Ecuaciones</h3>
            <div className="flex flex-col gap-1">
              {['biseccion', 'regulafalsi', 'newton', 'secante', 'punto_fijo'].map((m) => (
                <button 
                  key={m}
                  onClick={() => { setMetodo(m); setSeccion('raices'); limpiarResultados(); }}
                  className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all capitalize ${metodo === m ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                >
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4 pl-2 border-t border-zinc-200 dark:border-zinc-700 pt-8">Cálculo Avanzado</h3>
            <div className="flex flex-col gap-1">
              {['Integrales', 'Derivadas', 'Ecuaciones Dif.'].map((m) => (
                <button key={m} onClick={() => alert(`Pronto en CaneloMath.`)} className="text-left px-4 py-2.5 rounded-lg text-sm text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-not-allowed flex justify-between items-center transition-colors">
                  {m} <span className="text-[9px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 px-2 py-0.5 rounded-md">Pronto</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* CONTENIDO CENTRAL */}
        <section className="flex-1 flex flex-col gap-8">
          
          <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-8 border-b border-zinc-100 dark:border-zinc-800 pb-4 capitalize">
              Configuración de {metodo.replace('_', ' ')}
            </h2>
            
            {/* =========================================
                CAJA DEL INPUT + CÁMARA IA
            ========================================= */}
            <div className="mb-8 p-5 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-3 flex items-center justify-between">
                {metodo === 'punto_fijo' ? 'Función despejada g(x)' : 'Función f(x)'}
                {esPotencia && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md shadow-sm">Modo Potencia Activado</span>}
              </label>
              
              {/* Contenedor relativo para posicionar el botón de la cámara encima del input */}
              <div className="relative mb-4">
                <input 
                  type="text" 
                  value={funcion}
                  onChange={manejarInputFisico} 
                  placeholder={metodo === 'punto_fijo' ? 'Ej: cos(x) o sqrt(x + 2)' : 'Escribe o sube una foto de tu ecuación...'}
                  // pr-14 deja espacio para que el texto no se superponga con el botón
                  className="w-full p-4 pr-14 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg font-mono text-xl text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 outline-none transition-all shadow-inner"
                />
                
                {/* Botón Mágico de la IA */}
                <button 
                  onClick={() => fileInputRef.current.click()}
                  disabled={cargandoIA}
                  title="Extraer ecuación con IA (Sube una foto)"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center border border-zinc-200 dark:border-zinc-700"
                >
                  {cargandoIA ? (
                    <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.866-.5l-.8-1.6A1 1 0 0010.586 2H9.414a1 1 0 00-.866.5l-.8 1.6a1 1 0 01-.866.5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                {/* Input de archivo real, pero escondido */}
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={manejarSubidaImagen} 
                  className="hidden" 
                />
              </div>

              {metodo === 'punto_fijo' && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
                  En Punto Fijo tenés que ingresar una función <span className="font-mono">g(x)</span> en el campo principal y además una semilla numérica <span className="font-mono">x0</span>. No se usan intervalos.
                </div>
              )}

              <div className="mb-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={recomendarMetodoConIA}
                  disabled={cargandoRecomendacion || cargandoIA}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${cargandoRecomendacion || cargandoIA ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-500' : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-900 dark:hover:bg-amber-950/50'}`}
                >
                  {cargandoRecomendacion ? 'Analizando ecuación...' : 'Recomendar método con IA'}
                </button>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Analiza la ecuación y te sugiere el método más conveniente.
                </span>
              </div>

              {recomendacionMetodo && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-900 dark:bg-amber-950/30">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        Recomendación {recomendacionMetodo.fuente === 'ia' ? 'IA' : 'local'}
                      </p>
                      <h3 className="text-lg font-bold capitalize text-amber-950 dark:text-amber-50">
                        {recomendacionMetodo.metodo.replace('_', ' ')}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setMetodo(recomendacionMetodo.metodo)}
                        className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors"
                      >
                        Usar este método
                      </button>
                      <button
                        onClick={aplicarParametrosSugeridos}
                        className="px-4 py-2 rounded-lg bg-white text-amber-900 border border-amber-300 text-sm font-semibold hover:bg-amber-100 transition-colors dark:bg-transparent dark:text-amber-100 dark:border-amber-700 dark:hover:bg-amber-950/50"
                      >
                        Cargar puntos sugeridos
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-amber-950 dark:text-amber-50">{recomendacionMetodo.motivo}</p>
                  {recomendacionMetodo.advertencia && (
                    <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                      {recomendacionMetodo.advertencia}
                    </p>
                  )}
                  {recomendacionMetodo.parametros_sugeridos && Object.keys(recomendacionMetodo.parametros_sugeridos).length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      {Object.entries(recomendacionMetodo.parametros_sugeridos).map(([clave, valor]) => (
                        <span
                          key={clave}
                          className="rounded-full border border-amber-300 bg-white px-3 py-1 font-mono text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
                        >
                          {clave} = {typeof valor === 'number' ? valor.toFixed(4) : String(valor)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-6 gap-2">
                {TECLAS.map((tecla) => (
                  <button key={tecla.label} onClick={() => manejarTeclado(tecla.valor)} className={`py-3 text-sm font-semibold rounded-lg transition-all shadow-sm active:scale-95 ${tecla.valor === 'AC' ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900/40' : tecla.valor === 'DEL' ? 'bg-zinc-800 dark:bg-zinc-700 text-white hover:bg-zinc-700 dark:hover:bg-zinc-600' : tecla.valor === 'calculate' ? 'bg-blue-600 text-white hover:bg-blue-700' : tecla.valor === 'MODO_POTENCIA' ? (esPotencia ? 'bg-blue-600 text-white shadow-inner' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600') : !isNaN(tecla.label.charAt(0)) || tecla.label === '.' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600' }`}>
                    {tecla.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PARÁMETROS DINÁMICOS */}
            {(metodo === 'biseccion' || metodo === 'regulafalsi') && (
              <div className="mb-6 p-5 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 flex gap-4">
                <div className="w-1/2"><span className="block text-xs text-zinc-500 dark:text-zinc-300 mb-1 font-medium uppercase tracking-wider">Límite A</span><input type="number" step="any" value={limiteA} onChange={(e) => setLimiteA(e.target.value)} className="w-full p-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 shadow-sm" /></div>
                <div className="w-1/2"><span className="block text-xs text-zinc-500 dark:text-zinc-300 mb-1 font-medium uppercase tracking-wider">Límite B</span><input type="number" step="any" value={limiteB} onChange={(e) => setLimiteB(e.target.value)} className="w-full p-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 shadow-sm" /></div>
              </div>
            )}
            {(metodo === 'newton' || metodo === 'punto_fijo') && (
              <div className="mb-6 p-5 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <span className="block text-xs text-zinc-500 dark:text-zinc-300 mb-1 font-medium uppercase tracking-wider">{metodo === 'punto_fijo' ? 'Semilla Inicial (X0)' : 'Punto Inicial (X0)'}</span><input type="number" step="any" value={puntoX0} onChange={(e) => setPuntoX0(e.target.value)} placeholder={metodo === 'punto_fijo' ? 'Ej: 1.0' : ''} className="w-full p-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 shadow-sm" />
              </div>
            )}
            {metodo === 'secante' && (
              <div className="mb-6 p-5 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 flex gap-4">
                <div className="w-1/2"><span className="block text-xs text-zinc-500 dark:text-zinc-300 mb-1 font-medium uppercase tracking-wider">Punto Inicial X0</span><input type="number" step="any" value={puntoX0} onChange={(e) => setPuntoX0(e.target.value)} className="w-full p-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 shadow-sm" /></div>
                <div className="w-1/2"><span className="block text-xs text-zinc-500 dark:text-zinc-300 mb-1 font-medium uppercase tracking-wider">Punto Inicial X1</span><input type="number" step="any" value={puntoX1} onChange={(e) => setPuntoX1(e.target.value)} className="w-full p-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 shadow-sm" /></div>
              </div>
            )}

            <div className="mb-8 p-5 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 flex gap-4">
              <div className="w-1/2">
                <span className="block text-xs text-zinc-500 dark:text-zinc-300 mb-1 font-medium uppercase tracking-wider">Tolerancia (Error)</span>
                <input type="text" value={tolerancia} onChange={(e) => setTolerancia(e.target.value)} placeholder="Ej: 1e-10" className="w-full p-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 shadow-sm font-mono text-sm" />
              </div>
              <div className="w-1/2">
                <span className="block text-xs text-zinc-500 dark:text-zinc-300 mb-1 font-medium uppercase tracking-wider">Máx Iteraciones</span>
                <input type="number" value={maxIteraciones} onChange={(e) => setMaxIteraciones(e.target.value)} className="w-full p-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 shadow-sm font-mono text-sm" />
              </div>
            </div>

            {errorMensaje && (
              <div className="mb-6 p-5 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-start gap-4 shadow-sm">
                <div className="text-2xl mt-0.5">️</div>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wide mb-1 text-red-900">Alerta del Sistema</h4>
                  <p className="text-sm font-medium leading-relaxed">{errorMensaje}</p>
                </div>
              </div>
            )}

            <button onClick={ejecutarCalculo} disabled={cargando || cargandoIA} className={`w-full text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 ${cargando || cargandoIA ? 'bg-zinc-600 cursor-not-allowed' : 'bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98]'}`}>
              {cargando ? <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Procesando en Python...</> : 'Ejecutar Cálculo Numérico'}
            </button>
          </div>

          {/* =========================================
              VISOR GRÁFICO EN VIVO Y RESULTADOS
          ========================================= */}
          <div ref={resultadosRef} className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm mb-12">
            
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {resultados ? "Resultados del Análisis" : "Visor de Función"}
              </h2>
              {resultados && (
                <div className="max-w-full md:max-w-[70%] bg-green-50 text-green-700 px-4 py-2 rounded-xl text-sm font-semibold border border-green-200">
                  {obtenerRaicesMostradas(resultados).length > 1 ? (
                    <>
                      <div className="mb-1">Raíces halladas ({obtenerRaicesMostradas(resultados).length})</div>
                      <div className="flex flex-wrap gap-1">
                        {obtenerRaicesMostradas(resultados).map((r, i) => (
                          <span key={`${r}-${i}`} className="font-mono text-xs px-2 py-0.5 rounded-md bg-green-100 border border-green-200">
                            {r.toFixed(6)}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      Raíz hallada: <span className="font-mono">{obtenerRaizMostrada(resultados)?.toFixed(7) ?? '-'}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="mb-10">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-300">
                  Usá los controles de zoom y activá el modo arrastre si querés mover la vista del gráfico.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => ajustarZoom(0.8)}
                    className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Zoom +
                  </button>
                  <button
                    onClick={() => ajustarZoom(1.25)}
                    className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Zoom -
                  </button>
                  <button
                    onClick={reiniciarZoom}
                    className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setModoArrastreGrafico((prev) => !prev)}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${modoArrastreGrafico ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700' : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    {modoArrastreGrafico ? 'Arrastre: ON' : 'Arrastrar gráfico'}
                  </button>
                </div>
              </div>
              {obtenerRaicesMostradas(resultados).length > 1 && (
                <div className="mb-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-2">Seleccionar raíz para el paso a paso</p>
                  <div className="flex flex-wrap gap-2">
                    {obtenerRaicesMostradas(resultados).map((r, idx) => (
                      <button
                        key={`raiz-btn-${idx}`}
                        onClick={() => {
                          setIndiceRaizActiva(idx);
                          setPasoActual(0);
                          setReproduccionActiva(false);
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${indiceRaizActiva === idx ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
                      >
                        r{idx + 1}: {r.toFixed(6)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {obtenerIteracionesActivas().length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      Visualización paso a paso
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-300">
                      Paso {Math.min(pasoActual + 1, obtenerIteracionesActivas().length)} de {obtenerIteracionesActivas().length}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setReproduccionActiva(false);
                        setPasoActual(0);
                      }}
                      className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Reiniciar
                    </button>
                    <button
                      onClick={() => {
                        setReproduccionActiva(false);
                        setPasoActual((prev) => Math.max(prev - 1, 0));
                      }}
                      className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Paso -
                    </button>
                    <button
                      onClick={() => {
                        if (pasoActual >= obtenerIteracionesActivas().length - 1) {
                          setPasoActual(0);
                          setReproduccionActiva(true);
                          return;
                        }
                        setReproduccionActiva((prev) => !prev);
                      }}
                      className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-900 dark:bg-zinc-100 text-sm font-semibold text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
                    >
                      {reproduccionActiva ? 'Pausar' : 'Reproducir'}
                    </button>
                    <button
                      onClick={() => {
                        setReproduccionActiva(false);
                        setPasoActual((prev) => Math.min(prev + 1, obtenerIteracionesActivas().length - 1));
                      }}
                      className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Paso +
                    </button>
                  </div>
                </div>
              )}
              <div
                ref={contenedorGraficoRef}
                onMouseDown={iniciarArrastreGrafico}
                onMouseMove={moverGraficoArrastrando}
                onMouseUp={terminarArrastreGrafico}
                onMouseLeave={terminarArrastreGrafico}
                className={`w-full h-80 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 pt-6 pr-6 pb-2 pl-0 select-none ${arrastreGrafico ? 'cursor-grabbing' : modoArrastreGrafico ? 'cursor-grab' : 'cursor-default'}`}
                style={{ userSelect: 'none' }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={modoOscuro ? "#3f3f46" : "#e4e4e7"} />
                    <XAxis dataKey="x" type="number" domain={dominioX || ['auto', 'auto']} stroke={modoOscuro ? "#a1a1aa" : "#a1a1aa"} tick={{fill: modoOscuro ? '#d4d4d8' : '#71717a', fontSize: 12}} />
                    <YAxis dataKey="fx" type="number" stroke={modoOscuro ? "#a1a1aa" : "#a1a1aa"} tick={{fill: modoOscuro ? '#d4d4d8' : '#71717a', fontSize: 12}} domain={obtenerDominioYVisible()} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: modoOscuro ? '1px solid #3f3f46' : '1px solid #e4e4e7', backgroundColor: modoOscuro ? '#18181b' : '#ffffff' }} labelStyle={{ fontWeight: 'bold', color: modoOscuro ? '#f4f4f5' : '#18181b' }} formatter={(value, name) => [value, name === 'fx' ? 'f(x)' : 'Punto Calculado']} />
                    
                    {(metodo === 'biseccion' || metodo === 'regulafalsi') && obtenerIteracionActual()?.a !== undefined && obtenerIteracionActual()?.b !== undefined && (
                      <ReferenceArea
                        x1={obtenerIteracionActual().a}
                        x2={obtenerIteracionActual().b}
                        fill="#60a5fa"
                        fillOpacity={0.12}
                        strokeOpacity={0}
                      />
                    )}

                    <ReferenceLine y={0} stroke="#52525b" strokeWidth={1.5} opacity={0.6} />
                    <ReferenceLine x={0} stroke="#52525b" strokeWidth={1.5} opacity={0.6} />
                    
                    <Line data={datosGraficoVivo} dataKey="fx" type="monotone" stroke={modoOscuro ? "#f4f4f5" : "#18181b"} strokeWidth={2.5} dot={false} activeDot={{ r: 6, fill: modoOscuro ? '#f4f4f5' : '#18181b' }} connectNulls />

                    {metodo === 'newton' && obtenerTangenteActual().length > 1 && (
                      <Line
                        data={obtenerTangenteActual()}
                        dataKey="fx"
                        type="linear"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                        isAnimationActive={false}
                      />
                    )}

                    {obtenerMarcadoresRaices().length > 0 && (
                      <Scatter data={obtenerMarcadoresRaices()} dataKey="fx" fill="#22c55e" shape="circle" isAnimationActive={false} />
                    )}
                    
                    {obtenerPuntosIteracionVisibles().length > 0 && (
                      <Scatter data={obtenerPuntosIteracionVisibles()} dataKey="fx" fill="#ef4444" shape="circle" isAnimationActive={false} />
                    )}

                    {obtenerPuntoActual().length > 0 && (
                      <Scatter data={obtenerPuntoActual()} dataKey="fx" fill="#2563eb" shape="circle" isAnimationActive={false} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {resultados && (
              <div>
                <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider mb-4">Tabla de Iteraciones</h3>
                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold border-b border-zinc-200 dark:border-zinc-700">
                      <tr>
                        {Object.keys(obtenerIteracionesActivas()[0] || {}).map((key) => (
                          <th key={key} className={`px-6 py-4 uppercase ${key==='error'?'text-red-500':''} ${key.includes('raiz')||key==='c'||key==='xr'||key==='x2'||key==='g_xi'?'text-blue-600':''}`}>
                            {key.replace('_', ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
                      {obtenerIteracionesActivas().map((fila, idx) => (
                        <tr key={idx} className={`${idx === pasoActual ? 'bg-blue-50 dark:bg-blue-950/20' : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-800/60'} transition-colors`}>
                          {Object.values(fila).map((val, colIdx) => (
                            <td key={colIdx} className={`px-6 py-3 font-mono ${typeof val === 'number' ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-900 dark:text-zinc-100 font-bold'}`}>
                              {typeof val === 'number' ? val.toFixed(7) : val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

        </section>
      </main>
    </div>
  );
}

export default App;
