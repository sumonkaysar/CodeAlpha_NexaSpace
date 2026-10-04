function initializeWhiteboard() {
  const canvas = document.getElementById("whiteboard");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  context.lineWidth = 3;
  context.lineCap = "round";
  context.strokeStyle = "#23684d";

  let drawing = false;
  let lastPoint = null;

  const pointFrom = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  };

  const paint = (stroke) => {
    if (!stroke.points.length) return;

    context.strokeStyle = stroke.color || "#23684d";
    context.beginPath();
    context.moveTo(
      stroke.points[0].x * canvas.width,
      stroke.points[0].y * canvas.height,
    );

    stroke.points
      .slice(1)
      .forEach((point) =>
        context.lineTo(point.x * canvas.width, point.y * canvas.height),
      );

    context.stroke();
  };

  canvas.addEventListener("pointerdown", (event) => {
    drawing = true;
    lastPoint = pointFrom(event);
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!drawing) return;
    const point = pointFrom(event);
    const stroke = { points: [lastPoint, point], color: "#23684d" };
    paint(stroke);
    if (socket?.connected) socket.emit("whiteboard:draw", stroke);
    lastPoint = point;
  });

  const finish = () => {
    if (!drawing) return;
    drawing = false;
    if (lastPoint) {
      const stroke = { points: [lastPoint], color: "#23684d" };
      paint(stroke);
      if (socket?.connected) socket.emit("whiteboard:draw", stroke);
    }
    lastPoint = null;
  };

  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);

  window.drawRemoteStroke = paint;

  window.clearBoard = () =>
    context.clearRect(0, 0, canvas.width, canvas.height);
}
