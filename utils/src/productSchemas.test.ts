import { describe, expect, it } from "vitest";
import {
  ALLOWED_IMAGE_TYPES,
  base64DecodedBytes,
  createProductInputSchema,
  hasImageSignature,
  MAX_IDS_PER_QUERY,
  MAX_IMAGE_BYTES,
  MAX_PRODUCT_PRICE,
  parseDataUrl,
  PRODUCT_CATEGORIES,
  productCategorySchema,
  productImageSchema,
  productListQuerySchema,
  productListSchema,
  productSchema,
  updateProductInputSchema,
  uploadImageSchema,
} from "./productSchemas.ts";

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Codificador base64 de prueba (el paquete no tiene `btoa` ni `Buffer`).
function toBase64(bytes: Uint8Array): string {
  let out = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    const n = (a << 16) | (b << 8) | c;
    out += ALPHABET.charAt((n >> 18) & 63);
    out += ALPHABET.charAt((n >> 12) & 63);
    out += index + 1 < bytes.length ? ALPHABET.charAt((n >> 6) & 63) : "=";
    out += index + 2 < bytes.length ? ALPHABET.charAt(n & 63) : "=";
  }
  return out;
}

const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0];
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP_HEADER = [
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
];

function makeBytes(header: number[], total = 64): Uint8Array {
  const bytes = new Uint8Array(Math.max(total, header.length));
  bytes.set(header);
  return bytes;
}

function dataUrl(mime: string, header: number[], total = 64): string {
  return `data:${mime};base64,${toBase64(makeBytes(header, total))}`;
}

const validJpeg = dataUrl("image/jpeg", JPEG_HEADER);
const validPng = dataUrl("image/png", PNG_HEADER);
const validWebp = dataUrl("image/webp", WEBP_HEADER);

const validProduct = {
  name: "Polerón CC5003",
  description: "Polerón gris con el logo del curso.",
  category: "Poleras",
  price: 18000,
  image: validPng,
};

function firstMessage(
  result: { success: boolean; error?: { issues: { message: string }[] } },
): string | undefined {
  return result.error?.issues[0]?.message;
}

describe("PRODUCT_CATEGORIES", () => {
  it("contiene las categorías actuales del catálogo", () => {
    expect([...PRODUCT_CATEGORIES]).toEqual(["Tazas", "Poleras", "Stickers"]);
  });

  it("productCategorySchema rechaza categorías desconocidas", () => {
    expect(productCategorySchema.safeParse("Tazas").success).toBe(true);
    const result = productCategorySchema.safeParse("Gorras");
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Selecciona una categoría válida.");
  });
});

describe("constantes de límites", () => {
  it("fijan 1 MB, tres tipos, precio máximo y tope de ids", () => {
    expect(MAX_IMAGE_BYTES).toBe(1_048_576);
    expect([...ALLOWED_IMAGE_TYPES]).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    expect(MAX_PRODUCT_PRICE).toBe(10_000_000);
    expect(MAX_IDS_PER_QUERY).toBe(100);
  });
});

describe("parseDataUrl", () => {
  it("separa tipo y datos", () => {
    expect(parseDataUrl("data:image/png;base64,AAAA")).toEqual({
      mime: "image/png",
      base64: "AAAA",
    });
  });

  it("devuelve null si no es un data URL base64", () => {
    expect(parseDataUrl("/images/taza.png")).toBeNull();
    expect(parseDataUrl("data:image/png,AAAA")).toBeNull();
    expect(parseDataUrl("")).toBeNull();
  });
});

describe("base64DecodedBytes", () => {
  it("calcula los bytes con y sin relleno", () => {
    expect(base64DecodedBytes("")).toBe(0);
    expect(base64DecodedBytes("AAAA")).toBe(3);
    expect(base64DecodedBytes("AAA=")).toBe(2);
    expect(base64DecodedBytes("AA==")).toBe(1);
  });

  it("coincide con el tamaño real de los datos codificados", () => {
    for (const size of [1, 2, 3, 10, 1000]) {
      expect(base64DecodedBytes(toBase64(new Uint8Array(size)))).toBe(size);
    }
  });
});

describe("hasImageSignature", () => {
  const base64Of = (header: number[]) => toBase64(makeBytes(header));

  it("reconoce la firma de cada tipo", () => {
    expect(hasImageSignature("image/jpeg", base64Of(JPEG_HEADER))).toBe(true);
    expect(hasImageSignature("image/png", base64Of(PNG_HEADER))).toBe(true);
    expect(hasImageSignature("image/webp", base64Of(WEBP_HEADER))).toBe(true);
  });

  it("rechaza una firma que no corresponde al tipo declarado", () => {
    expect(hasImageSignature("image/png", base64Of(JPEG_HEADER))).toBe(false);
    expect(hasImageSignature("image/jpeg", base64Of(WEBP_HEADER))).toBe(false);
    expect(hasImageSignature("image/webp", base64Of(PNG_HEADER))).toBe(false);
  });

  it("rechaza RIFF sin la marca WEBP y tipos desconocidos", () => {
    const riffWave = [
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45,
    ];
    expect(hasImageSignature("image/webp", base64Of(riffWave))).toBe(false);
    expect(hasImageSignature("image/gif", base64Of(JPEG_HEADER))).toBe(false);
  });

  it("rechaza contenido vacío o demasiado corto", () => {
    expect(hasImageSignature("image/jpeg", "")).toBe(false);
    expect(hasImageSignature("image/png", "iVA=")).toBe(false);
  });
});

describe("uploadImageSchema", () => {
  it("acepta JPEG, PNG y WebP válidos", () => {
    expect(uploadImageSchema.safeParse(validJpeg).success).toBe(true);
    expect(uploadImageSchema.safeParse(validPng).success).toBe(true);
    expect(uploadImageSchema.safeParse(validWebp).success).toBe(true);
  });

  it("rechaza la imagen ausente o vacía como obligatoria", () => {
    expect(firstMessage(uploadImageSchema.safeParse(undefined))).toBe(
      "La imagen es obligatoria.",
    );
    expect(firstMessage(uploadImageSchema.safeParse(""))).toBe(
      "La imagen es obligatoria.",
    );
  });

  it.each([
    ["image/gif", dataUrl("image/gif", [0x47, 0x49, 0x46, 0x38])],
    ["image/svg+xml", dataUrl("image/svg+xml", [0x3c, 0x73, 0x76, 0x67])],
    ["text/html", dataUrl("text/html", [0x3c, 0x68, 0x74, 0x6d, 0x6c])],
  ])("rechaza el tipo %s", (_name, value) => {
    expect(firstMessage(uploadImageSchema.safeParse(value))).toBe(
      "Formato de imagen no permitido. Usa JPG, PNG o WebP.",
    );
  });

  it("rechaza un valor que no es un data URL", () => {
    for (const value of ["/images/taza.png", "https://x.cl/a.png", "hola"]) {
      expect(firstMessage(uploadImageSchema.safeParse(value))).toBe(
        "Formato de imagen no permitido. Usa JPG, PNG o WebP.",
      );
    }
  });

  it("rechaza base64 corrupto", () => {
    for (const value of [
      "data:image/png;base64,@@@@",
      "data:image/png;base64,iVBO",
      "data:image/png;base64,iVB",
      "data:image/png;base64,iV=B",
    ]) {
      const result = uploadImageSchema.safeParse(value);
      expect(result.success, value).toBe(false);
      expect(firstMessage(result)).toBe("El archivo no es una imagen válida.");
    }
  });

  it("rechaza una firma que no coincide con el tipo declarado", () => {
    const pngDeclaredAsJpeg = dataUrl("image/jpeg", PNG_HEADER);
    expect(firstMessage(uploadImageSchema.safeParse(pngDeclaredAsJpeg))).toBe(
      "El archivo no es una imagen válida.",
    );
  });

  it("rechaza datos vacíos", () => {
    expect(
      firstMessage(uploadImageSchema.safeParse("data:image/png;base64,")),
    ).toBe("El archivo no es una imagen válida.");
  });

  it("acepta exactamente 1 MB y rechaza 1 MB + 1 byte", () => {
    const atLimit = dataUrl("image/jpeg", JPEG_HEADER, MAX_IMAGE_BYTES);
    const overLimit = dataUrl("image/jpeg", JPEG_HEADER, MAX_IMAGE_BYTES + 1);

    expect(uploadImageSchema.safeParse(atLimit).success).toBe(true);
    const result = uploadImageSchema.safeParse(overLimit);
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("La imagen no puede superar 1 MB.");
  });
});

describe("productImageSchema", () => {
  it("acepta data URL válido, ruta del sitio y URL http(s)", () => {
    for (const value of [
      validWebp,
      "/images/taza-dcc.png",
      "/api/products/6713b0c2a1f4e9d2c8b70a11/image?v=1760367600000",
      "https://cdn.dcc.cl/taza.png",
      "http://localhost:3001/a.png",
    ]) {
      expect(productImageSchema.safeParse(value).success, value).toBe(true);
    }
  });

  it("rechaza data URL inválido, rutas relativas y otros esquemas", () => {
    for (const value of [
      "",
      "taza.png",
      "//evil.cl/a.png",
      "javascript:alert(1)",
      "ftp://x.cl/a.png",
      dataUrl("image/gif", [0x47, 0x49, 0x46, 0x38]),
      dataUrl("image/jpeg", PNG_HEADER),
      "/images/con espacio.png",
    ]) {
      expect(productImageSchema.safeParse(value).success, value).toBe(false);
    }
  });
});

describe("createProductInputSchema", () => {
  it("acepta un producto válido y recorta espacios", () => {
    const result = createProductInputSchema.safeParse({
      ...validProduct,
      name: "  Polerón CC5003  ",
      description: "  Descripción  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Polerón CC5003");
      expect(result.data.description).toBe("Descripción");
    }
  });

  it("acepta nombre de 80 y descripción de 1000 caracteres", () => {
    expect(
      createProductInputSchema.safeParse({
        ...validProduct,
        name: "a".repeat(80),
        description: "b".repeat(1000),
      }).success,
    ).toBe(true);
  });

  it("rechaza nombre vacío, solo espacios o de 81 caracteres", () => {
    for (const name of ["", "   ", "a".repeat(81)]) {
      expect(
        createProductInputSchema.safeParse({ ...validProduct, name }).success,
        name,
      ).toBe(false);
    }
    expect(
      firstMessage(createProductInputSchema.safeParse({ ...validProduct, name: "" })),
    ).toBe("El nombre es obligatorio.");
  });

  it("rechaza descripción vacía o de 1001 caracteres", () => {
    for (const description of ["", "  ", "b".repeat(1001)]) {
      expect(
        createProductInputSchema.safeParse({ ...validProduct, description })
          .success,
      ).toBe(false);
    }
  });

  it("rechaza categorías fuera del enum", () => {
    const result = createProductInputSchema.safeParse({
      ...validProduct,
      category: "Gorras",
    });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Selecciona una categoría válida.");
  });

  it.each([0, -1, 1.5, 10_000_001, "abc", null, Number.NaN])(
    "rechaza el precio %s",
    (price) => {
      expect(
        createProductInputSchema.safeParse({ ...validProduct, price }).success,
      ).toBe(false);
    },
  );

  it("acepta precio mínimo y máximo", () => {
    for (const price of [1, MAX_PRODUCT_PRICE]) {
      expect(
        createProductInputSchema.safeParse({ ...validProduct, price }).success,
      ).toBe(true);
    }
  });

  it("exige todos los campos", () => {
    for (const field of Object.keys(validProduct)) {
      const rest: Record<string, unknown> = { ...validProduct };
      delete rest[field];
      expect(createProductInputSchema.safeParse(rest).success, field).toBe(
        false,
      );
    }
  });

  it("exige la imagen como data URL (no acepta rutas)", () => {
    const result = createProductInputSchema.safeParse({
      ...validProduct,
      image: "/images/taza-dcc.png",
    });
    expect(result.success).toBe(false);
    expect(
      createProductInputSchema.safeParse({ ...validProduct, image: undefined })
        .success,
    ).toBe(false);
  });

  it("descarta featured, seller, id y campos desconocidos", () => {
    const result = createProductInputSchema.safeParse({
      ...validProduct,
      featured: true,
      seller: "otro",
      id: "x",
      isAdmin: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data).sort()).toEqual([
        "category",
        "description",
        "image",
        "name",
        "price",
      ]);
    }
  });
});

describe("updateProductInputSchema", () => {
  it("acepta cualquier subconjunto de campos válidos", () => {
    expect(updateProductInputSchema.safeParse({ price: 15000 }).success).toBe(
      true,
    );
    expect(
      updateProductInputSchema.safeParse({
        name: "Nuevo",
        image: validJpeg,
      }).success,
    ).toBe(true);
    expect(updateProductInputSchema.safeParse(validProduct).success).toBe(true);
  });

  it("rechaza un cuerpo vacío o con solo campos desconocidos", () => {
    for (const body of [{}, { featured: true }, { seller: "x", id: "y" }]) {
      const result = updateProductInputSchema.safeParse(body);
      expect(result.success).toBe(false);
      expect(firstMessage(result)).toBe("No hay cambios para guardar.");
    }
  });

  it("valida cada campo enviado con las mismas reglas", () => {
    expect(updateProductInputSchema.safeParse({ price: 0 }).success).toBe(false);
    expect(updateProductInputSchema.safeParse({ name: "" }).success).toBe(false);
    expect(
      updateProductInputSchema.safeParse({ category: "Gorras" }).success,
    ).toBe(false);
    expect(
      updateProductInputSchema.safeParse({
        image: dataUrl("image/gif", [0x47, 0x49, 0x46, 0x38]),
      }).success,
    ).toBe(false);
  });

  it("descarta featured y seller junto a campos válidos", () => {
    const result = updateProductInputSchema.safeParse({
      price: 9000,
      featured: true,
      seller: "otro",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ price: 9000 });
    }
  });
});

describe("productSchema", () => {
  const publicProduct = {
    id: "6713b0c2a1f4e9d2c8b70a11",
    name: "Polerón CC5003",
    description: "Polerón gris.",
    category: "Poleras",
    price: 18000,
    image: "/api/products/6713b0c2a1f4e9d2c8b70a11/image?v=1760367600000",
    featured: false,
    seller: {
      id: "6712a4f3c9b1e24a8f0d1234",
      username: "anaperez",
      displayName: "Ana Pérez",
    },
    createdAt: "2026-10-13T15:00:00.000Z",
    updatedAt: "2026-10-13T15:00:00.000Z",
  };

  it("acepta el contrato público", () => {
    expect(productSchema.safeParse(publicProduct).success).toBe(true);
    expect(productListSchema.safeParse([publicProduct]).success).toBe(true);
  });

  it("acepta una imagen de seed con ruta del sitio", () => {
    expect(
      productSchema.safeParse({ ...publicProduct, image: "/images/taza-dcc.png" })
        .success,
    ).toBe(true);
  });

  it("rechaza productos sin vendedor, con fechas inválidas o categoría desconocida", () => {
    const { seller: _seller, ...withoutSeller } = publicProduct;
    expect(productSchema.safeParse(withoutSeller).success).toBe(false);
    expect(
      productSchema.safeParse({ ...publicProduct, createdAt: "ayer" }).success,
    ).toBe(false);
    expect(
      productSchema.safeParse({ ...publicProduct, category: "Gorras" }).success,
    ).toBe(false);
    expect(
      productSchema.safeParse({ ...publicProduct, price: 1.5 }).success,
    ).toBe(false);
  });

  it("no expone campos privados del vendedor", () => {
    const result = productSchema.safeParse({
      ...publicProduct,
      seller: { ...publicProduct.seller, email: "ana@dcc.uchile.cl" },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.seller).not.toHaveProperty("email");
    }
  });
});

describe("productListQuerySchema", () => {
  it("acepta una consulta vacía", () => {
    const result = productListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  it("valida categoria contra el enum", () => {
    expect(productListQuerySchema.safeParse({ categoria: "Tazas" }).success).toBe(
      true,
    );
    expect(productListQuerySchema.safeParse({ categoria: "Gorras" }).success).toBe(
      false,
    );
    expect(productListQuerySchema.safeParse({ categoria: "tazas" }).success).toBe(
      false,
    );
  });

  it("convierte featured a booleano y rechaza otros valores", () => {
    const yes = productListQuerySchema.safeParse({ featured: "true" });
    const no = productListQuerySchema.safeParse({ featured: "false" });
    expect(yes.success && yes.data.featured).toBe(true);
    expect(no.success && no.data.featured).toBe(false);
    expect(productListQuerySchema.safeParse({ featured: "1" }).success).toBe(
      false,
    );
    expect(productListQuerySchema.safeParse({ featured: "" }).success).toBe(
      false,
    );
  });

  it("separa ids, recorta, quita vacíos y duplicados conservando el orden", () => {
    const result = productListQuerySchema.safeParse({
      ids: " b , a,,b,c ,a",
    });
    expect(result.success && result.data.ids).toEqual(["b", "a", "c"]);
  });

  it("ids vacío produce una lista vacía", () => {
    const result = productListQuerySchema.safeParse({ ids: "" });
    expect(result.success && result.data.ids).toEqual([]);
  });

  it("acepta 100 ids y rechaza 101", () => {
    const make = (count: number) =>
      Array.from({ length: count }, (_, index) => `id${index}`).join(",");

    const ok = productListQuerySchema.safeParse({ ids: make(100) });
    expect(ok.success && ok.data.ids?.length).toBe(100);
    expect(productListQuerySchema.safeParse({ ids: make(101) }).success).toBe(
      false,
    );
  });

  it("rechaza ids repetidos como parámetro (arreglo)", () => {
    expect(productListQuerySchema.safeParse({ ids: ["a", "b"] }).success).toBe(
      false,
    );
  });

  it("combina filtros y descarta parámetros desconocidos", () => {
    const result = productListQuerySchema.safeParse({
      categoria: "Poleras",
      featured: "true",
      ids: "a,b",
      orden: "precio",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        categoria: "Poleras",
        featured: true,
        ids: ["a", "b"],
      });
    }
  });
});
