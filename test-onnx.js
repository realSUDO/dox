try {
  require('onnxruntime-node');
  console.log("Successfully loaded ONNX runtime!");
} catch(err) {
  console.error("Failed to load:", err);
}
