import { admin, db } from "../database/config"; // <-- Ajusta la ruta según tu proyecto

const test = async () => {
  try {
    console.log("🔥 Probando conexión a Firestore...");

    // Intentar crear un documento temporal
    const ref = db.collection("test_connection").doc("ping");
    await ref.set({
      ok: true,
      timestamp: new Date(),
    });

    console.log("✅ Documento creado correctamente en Firestore!");

    // Listar colecciones
    const collections = await db.listCollections();
    console.log("📁 Colecciones encontradas:", collections.map(c => c.id));

    console.log("✅ TODO OK: Firestore está funcionando.");
  } catch (err) {
    console.error("❌ FIRESTORE ERROR:", err);
  }
};

test();
