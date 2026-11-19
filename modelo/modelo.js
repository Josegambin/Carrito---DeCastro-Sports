/** MODELO · ALUMNADO · SOLO EDITAR ESTE ARCHIVO
 * Trabaja los TODO en orden. NO borres los export ni cambies los nombres.
 * Cuando una prueba falle, lee qué esperaba antes de pedir ayuda.
 */
import { crearFormateadorMoneda, redondear } from "../utils/numeros.js";

// PASO 1 · Configuración y validaciones
export const CONFIG = Object.freeze({ iva: 0.21, descuentoMaximo: 0.9, locale: "es-ES", moneda: "EUR" });
export const formatearMoneda = crearFormateadorMoneda(CONFIG.locale, CONFIG.moneda);
const PATRON_SKU = /^[A-Z]{3}-\d{4}$/;
export class ErrorValidacion extends Error {
  constructor(campo, mensaje) {
    super(mensaje);
    this.name = "ErrorValidacion";
    this.campo = campo;
  }
}
function exigirTexto(campo, valor, longitudMinima = 2) {
  //  1A: si no es string o tiene pocos caracteres tras trim(), lanzar ErrorValidacion(campo, mensaje).
  if (typeof valor !== "string" || valor.trim().length < longitudMinima) {
    throw new ErrorValidacion(
      campo,
      `El campo "${campo}" debe ser un texto con un tamaño minimo de ${longitudMinima} caracteres.`
    );
  }

  return valor.trim();
}


function exigirNumeroNoNegativo(campo, valor) {
  //  1B: typeof number, Number.isFinite(valor) y valor >= 0.
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
    throw new ErrorValidacion(
      campo,
      `El campo "${campo}" debe ser un numero mayor o igual a 0.`
    );
  }
  return valor;
}


function exigirEnteroPositivo(campo, valor) {
  //  1C: Number.isInteger(valor) y valor > 0.

  if (!Number.isInteger(valor) || valor <= 0) {
    throw new ErrorValidacion(
      campo,
      `El campo "${campo}" debe ser un numero entero y positivo.`
    )
  }

  return valor;
}
function exigirEnteroNoNegativo(campo, valor) {
  //  1D: Number.isInteger(valor) y valor >= 0.
  if (!Number.isInteger(valor) || valor < 0) {
    throw new ErrorValidacion(
      campo,
      `El campo "${campo}" debe ser un numero entero mayor o igual a 0.`
    )
  }

  return valor;
}



// PASO 2 · Producto
export class Producto {
  #sku; #nombre; #precio; #stock;

  constructor({ sku, nombre, precio, stock = 0 }) {
    //  2A: comprobar PATRON_SKU.test(sku) y guardar #sku.
    if (typeof sku !== "string" || !PATRON_SKU.test(sku.trim())) {
      throw new ErrorValidacion(
        "sku",
        `El SKU -> "${sku}" debe tener el formato AAA-0000.`
      );
    }
    // 2B: asignar this.nombre y this.precio para pasar por los setters.
    this.#sku = sku.trim();

    this.nombre = nombre;
    this.precio = precio;

    //  2C: validar stock y guardar #stock.
    this.#stock = exigirEnteroNoNegativo("stock", stock);
  }

  get sku() { return this.#sku; }
  get nombre() { return this.#nombre; }
  set nombre(valor) {
    // 2D: validar con exigirTexto y guardar valor.trim().
    this.#nombre = exigirTexto("nombre", valor);
  }
  get precio() { return this.#precio; }
  set precio(valor) {
    // 2E: validar ANTES de guardar.
    this.#precio = exigirEnteroPositivo("precio", valor);
  }
  get stock() { return this.#stock; }
  hayStock(cantidad = 1) {

    //  2F: devolver booleano comparando cantidad y #stock.
    const cant = exigirEnteroPositivo("cantiad", cantidad)
    return this.#stock >= cant;

  }

  reponer(cantidad) {
    const validada = exigirEnteroPositivo("cantidad", cantidad);
    this.#stock += validada;
  }

  retirar(cantidad) {
    const validada = exigirEnteroPositivo("cantidad", cantidad);
    if (!this.hayStock(validada)) {
      throw new ErrorValidacion("stock", "Stock insuficiente para realizar la retirada.");
    }
    this.#stock -= validada;
  }

  precioConIVA() {
    return redondear(this.#precio * (1 + CONFIG.iva));
  }

  resumen() {
    return `${this.#nombre} (${this.#sku}) - ${formatearMoneda(this.precioConIVA())}`;
  }

  toJSON() {
    return {
      sku: this.#sku,
      nombre: this.#nombre,
      precio: this.#precio,
      stock: this.#stock
    };
  }
}

// PASO 3 · Herencia
export class ProductoRebajado extends Producto {
  #descuento;

  constructor(datos) {
    super(datos);
    //  3A: validar descuento > 0 y <= CONFIG.descuentoMaximo, finito; guardar #descuento.
    const { descuento } = datos;
    if (typeof descuento !== "number" ||
      !Number.isFinite(descuento) ||
      descuento <= 0 ||
      descuento > CONFIG.descuentoMaximo
    ) {
      throw new ErrorValidacion(
        "descuento",
        `El descuento debe ser un número mayor que 0 y menor o igual a ${CONFIG.descuentoMaximo}.`
      );
    }
    this.#descuento = descuento;
  }

  get descuento() {
    return this.#descuento;
  }

  precioConIVA() {
    //  3B: redondear(super.precioConIVA() * (1 - this.#descuento)).
    return redondear(super.precioConIVA() * (1 - this.#descuento));
  }

  resumen() {
    //  3C: ampliar super.resumen() con [-15 %] (según descuento).
    const porcentaje = redondear(this.#descuento * 100);
    return `${super.resumen()} [-${porcentaje} %]`;
  }

  toJSON() {
    //  3D: devolver {...super.toJSON(), descuento: this.#descuento}.
    return {
      ...super.toJSON(),
      descuento: this.#descuento,
    };
  }
}

// PASO 4 · Carrito
export class Carrito {
  #lineas = [];

  #buscarLinea(sku) {
    //  4A: find sobre #lineas, comparando producto.sku.
    return this.#lineas.find((linea) => linea.producto.sku === sku);
  }

  agregar(producto, cantidad = 1) {
    //  4B: validar instanceof Producto y cantidad positiva.
    if (!(producto instanceof Producto)) {
      throw new ErrorValidacion(
        "producto",
        "El artículo debe ser una instancia válida de Producto."
      );
    }
    const cantValidada = exigirEnteroPositivo("cantidad", cantidad);

    //  4C: sumar cantidad existente, comprobar stock TOTAL, actualizar o push.
    const lineaExistente = this.#buscarLinea(producto.sku);
    const cantidadTotal = (lineaExistente ? lineaExistente.cantidad : 0) + cantValidada;

    if (!producto.hayStock(cantidadTotal)) {
      throw new ErrorValidacion(
        "stock",
        `Stock insuficiente para "${producto.nombre}" (solicitado: ${cantidadTotal}, disponible: ${producto.stock}).`
      );
    }

    if (lineaExistente) {
      lineaExistente.cantidad = cantidadTotal;
    } else {
      this.#lineas.push({ producto, cantidad: cantValidada });
    }
  }

  quitar(sku) {
    //  4D: findIndex y splice; si no existe, ErrorValidacion('sku', mensaje).
    const indice = this.#lineas.findIndex((linea) => linea.producto.sku === sku);
    if (indice === -1) {
      throw new ErrorValidacion(
        "sku",
        `No se encontró ningún producto con SKU "${sku}" en el carrito.`
      );
    }
    this.#lineas.splice(indice, 1);
  }

  vaciar() {
    //  4E: dejar #lineas vacío.
    this.#lineas.length = 0;
  }

  get lineas() {
    //  4F: copia del array Y de cada registro {producto, cantidad}.
    return this.#lineas.map(({ producto, cantidad }) => ({ producto, cantidad }));
  }

  get unidades() {
    //  4G: reduce sumando cantidades.
    return this.#lineas.reduce((acc, linea) => acc + linea.cantidad, 0);
  }

  get total() {
    //  4H: reduce con producto.precioConIVA() * cantidad y redondear.
    const suma = this.#lineas.reduce(
      (acc, { producto, cantidad }) => acc + producto.precioConIVA() * cantidad,
      0
    );
    return redondear(suma);
  }

  resumen() {
    //  4I: si vacío '(carrito vacío)'; si no, líneas y TOTAL.
    if (this.#lineas.length === 0) {
      return "(carrito vacío)";
    }

    const detalleLineas = this.#lineas.map(({ producto, cantidad }) => {
      const subtotal = redondear(producto.precioConIVA() * cantidad);
      return `- ${producto.nombre} (${producto.sku}) x${cantidad}: ${formatearMoneda(subtotal)}`;
    });

    detalleLineas.push(`TOTAL: ${formatearMoneda(this.total)}`);
    return detalleLineas.join("\n");
  }

  confirmarCompra() {
    //  4J: si vacío, error; PASADA 1 comprobar todas las líneas.
    if (this.#lineas.length === 0) {
      throw new ErrorValidacion(
        "carrito",
        "No se puede confirmar la compra porque el carrito está vacío."
      );
    }

    for (const { producto, cantidad } of this.#lineas) {
      if (!producto.hayStock(cantidad)) {
        throw new ErrorValidacion(
          "stock",
          `Stock insuficiente para "${producto.nombre}" al confirmar la compra.`
        );
      }
    }

    //  4K: guardar {unidades,total}; PASADA 2 retirar; vaciar y devolver resumen.
    const resultado = {
      unidades: this.unidades,
      total: this.total,
    };

    for (const { producto, cantidad } of this.#lineas) {
      producto.retirar(cantidad);
    }

    this.vaciar();
    return resultado;
  }
}

// PASO 5 · Datos API
export function crearProducto(registroApi) {
  //  5A: validar que sea objeto no null.
  if (typeof registroApi !== "object" || registroApi === null || Array.isArray(registroApi)) {
    throw new ErrorValidacion(
      "registroApi",
      "El registro de la API debe ser un objeto válido."
    );
  }

  //  5B: mapear name->nombre, price->precio, discount->descuento.
  const datos = {
    sku: registroApi.sku,
    nombre: registroApi.name,
    precio: registroApi.price,
    stock: registroApi.stock,
    descuento: registroApi.discount,
  };

  //  5C: devolver Producto o ProductoRebajado según exista discount.
  if (datos.descuento !== undefined && datos.descuento !== null) {
    return new ProductoRebajado(datos);
  }

  return new Producto(datos);
}

export function construirCatalogo(registrosApi) {
  const validos = [];
  const rechazados = [];
  const skusVistos = new Set();

  //  5D: recorrer con forEach((registro, indice) => {...}).
  registrosApi.forEach((registro, indice) => {
    //  5E: try/catch DENTRO; crearProducto, detectar duplicados, guardar válido.
    try {
      const producto = crearProducto(registro);

      if (skusVistos.has(producto.sku)) {
        throw new ErrorValidacion(
          "sku",

          `El SKU "${producto.sku}" está duplicado en el catálogo.`
        );
      }

      skusVistos.add(producto.sku);
      validos.push(producto);
    } catch (error) {
      //  5F: si ErrorValidacion, push {indice, sku, motivo}; si otro error, throw error.
      if (error instanceof ErrorValidacion) {
        const skuFallido =
          registro && typeof registro === "object" && registro.sku
            ? registro.sku
            : "(sin sku)";

        rechazados.push({
          indice,
          sku: skuFallido,
          motivo: error.message,
        });
      } else {
        throw error;
      }
    }
  });

  return { validos, rechazados };
}
