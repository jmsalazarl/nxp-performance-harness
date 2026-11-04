import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import App from "../../src/App";

describe("AnalysisIntake", () => {
  afterEach(() => {
    cleanup();
  });

  it("abre el wizard desde Nuevo analisis", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /nuevo analisis/i }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Construye tu plan de performance" })).toBeTruthy();
    expect(screen.getByText("Define el escenario")).toBeTruthy();
  });

  it("navega por las secciones y conserva una respuesta", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /nuevo analisis/i }));

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Cuantas personas esperas atender?")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Clientes en 6 meses"), { target: { value: "10000" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("Describe una operacion importante")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect((screen.getByLabelText("Clientes en 6 meses") as HTMLInputElement).value).toBe("10000");
  });

  it("muestra errores de demanda y bloquea el avance con valores invalidos", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /nuevo analisis/i }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.change(screen.getByLabelText("Porcentaje de trafico pico"), { target: { value: "101" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Corrige estos valores antes de continuar:")).toBeTruthy();
    expect(screen.getByText("Cuantas personas esperas atender?")).toBeTruthy();
  });

  it("permite cerrar el wizard sin afectar el builder", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /nuevo analisis/i }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar analisis" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Endpoints")).toBeTruthy();
  });

  it("aprueba y congela un contrato cuando el plan es valido", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /nuevo analisis/i }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.change(screen.getByLabelText("Usuarios activos diarios"), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("Sesiones por usuario al dia"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Porcentaje de trafico pico"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.change(screen.getByLabelText("Nombre del journey"), { target: { value: "Busqueda" } });
    fireEvent.change(screen.getByLabelText("Porcentaje de usuarios"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Frecuencia por usuario al dia"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Duracion promedio"), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("Operaciones por journey"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    fireEvent.click(screen.getByRole("button", { name: "Aprobar y congelar contrato" }));

    await waitFor(() => expect(screen.getByText("Aprobado")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Descargar contrato" })).toBeTruthy();
  });
});
