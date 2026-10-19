export const STORAGE_KEY = "dermavision-demo-v1";
export const IMAGE_DB_NAME = "dermavision-demo-images";
export const TODAY = "2026-10-19";

export function createSeedState() {
  return {
    schemaVersion: 1,
    clinic: {
      name: "DermaVision Clínica Dermatológica",
      registration: "00.000.000/0000-00",
      phone: "(11) 4000-2026",
      email: "contato@dermavision.demo",
      address: "Av. das Palmeiras, 420 · São Paulo, SP",
      timezone: "America/Sao_Paulo",
      reminderHours: 24,
      defaultDuration: 30
    },
    currentUser: { name: "Dra. Mariana Martins", email: "dra.mariana@dermavision.demo", role: "Dermatologista", initials: "MM" },
    patients: [
      { id: "P-10284", name: "Helena Duarte", dob: "1978-03-21", sex: "Feminino", cpf: "000.000.000-00", phone: "(11) 99900-0101", email: "helena.duarte@example.test", status: "active", createdAt: "2025-04-18", notes: "Prefere contato por telefone.", lastVisit: "2026-10-19" },
      { id: "P-10279", name: "Rafael Nogueira", dob: "1989-11-04", sex: "Masculino", cpf: "000.000.000-01", phone: "(11) 99900-0102", email: "rafael.nogueira@example.test", status: "active", createdAt: "2025-05-02", notes: "", lastVisit: "2026-10-19" },
      { id: "P-10261", name: "Lívia Sampaio", dob: "1994-07-15", sex: "Feminino", cpf: "000.000.000-02", phone: "(11) 99900-0103", email: "livia.sampaio@example.test", status: "active", createdAt: "2025-06-12", notes: "", lastVisit: "2026-10-15" },
      { id: "P-10247", name: "Caio Mendonça", dob: "1967-01-29", sex: "Masculino", cpf: "000.000.000-03", phone: "(11) 99900-0104", email: "caio.mendonca@example.test", status: "active", createdAt: "2025-08-03", notes: "", lastVisit: "2026-10-12" },
      { id: "P-10233", name: "Beatriz Freire", dob: "1983-09-09", sex: "Feminino", cpf: "000.000.000-04", phone: "(11) 99900-0105", email: "beatriz.freire@example.test", status: "inactive", createdAt: "2025-09-20", notes: "Cadastro inativo para fins de demonstração.", lastVisit: "2026-08-30" }
    ],
    appointments: [
      { id: "C-5501", patientId: "P-10284", date: TODAY, time: "09:00", duration: 30, type: "Retorno dermatológico", status: "completed", provider: "Dra. Mariana Martins", note: "Atendimento de acompanhamento registrado." },
      { id: "C-5502", patientId: "P-10279", date: TODAY, time: "10:30", duration: 30, type: "Acompanhamento", status: "completed", provider: "Dra. Mariana Martins", note: "Registro de evolução clínica." },
      { id: "C-5503", patientId: "P-10261", date: TODAY, time: "14:20", duration: 40, type: "Consulta dermatológica", status: "scheduled", provider: "Dra. Mariana Martins", note: "" },
      { id: "C-5504", patientId: "P-10247", date: TODAY, time: "15:10", duration: 30, type: "Retorno dermatológico", status: "scheduled", provider: "Dra. Mariana Martins", note: "" },
      { id: "C-5505", patientId: "P-10284", date: "2026-10-21", time: "09:30", duration: 30, type: "Acompanhamento", status: "scheduled", provider: "Dra. Mariana Martins", note: "" },
      { id: "C-5506", patientId: "P-10279", date: "2026-10-22", time: "11:00", duration: 30, type: "Retorno dermatológico", status: "scheduled", provider: "Dra. Mariana Martins", note: "" },
      { id: "C-5507", patientId: "P-10233", date: "2026-08-30", time: "13:40", duration: 30, type: "Consulta dermatológica", status: "completed", provider: "Dra. Mariana Martins", note: "" },
      { id: "C-5508", patientId: "P-10261", date: "2026-10-15", time: "16:00", duration: 30, type: "Acompanhamento", status: "completed", provider: "Dra. Mariana Martins", note: "" }
    ],
    lesions: [
      { id: "L-0245", patientId: "P-10284", location: "Braço esquerdo · face externa", view: "front", x: 60, y: 34, status: "stable", firstSeen: "2025-05-12", measurements: [{ date: "2026-10-02", length: 4.2, width: 3.7, notes: "Registro de acompanhamento" }, { date: "2026-04-08", length: 4.1, width: 3.7, notes: "Registro de acompanhamento" }, { date: "2025-11-13", length: 4.0, width: 3.6, notes: "Registro inicial" }], description: "Área pigmentada de formato oval, bordas regulares à inspeção registrada.", images: [], archived: false },
      { id: "L-0246", patientId: "P-10284", location: "Ombro direito · região posterior", view: "back", x: 57, y: 24, status: "attention", firstSeen: "2025-10-07", measurements: [{ date: "2026-10-02", length: 5.1, width: 4.4, notes: "Revisar registro fotográfico na próxima consulta" }, { date: "2026-04-08", length: 4.8, width: 4.2, notes: "Registro de acompanhamento" }], description: "Registro longitudinal com nova medida para conferência profissional.", images: [], archived: false },
      { id: "L-0188", patientId: "P-10279", location: "Costas · lado esquerdo", view: "back", x: 43, y: 39, status: "priority", firstSeen: "2025-08-14", measurements: [{ date: "2026-10-11", length: 6.0, width: 5.4, notes: "Aguardando revisão clínica" }, { date: "2026-05-20", length: 5.6, width: 5.0, notes: "Registro de acompanhamento" }], description: "Marcador de revisão definido pela equipe clínica da demonstração.", images: [], archived: false },
      { id: "L-0191", patientId: "P-10279", location: "Antebraço direito · face anterior", view: "front", x: 43, y: 44, status: "stable", firstSeen: "2025-09-02", measurements: [{ date: "2026-05-20", length: 3.0, width: 2.7, notes: "Registro de acompanhamento" }], description: "Registro de acompanhamento longitudinal.", images: [], archived: false },
      { id: "L-0304", patientId: "P-10261", location: "Perna esquerda · região anterior", view: "front", x: 56, y: 72, status: "attention", firstSeen: "2026-01-17", measurements: [{ date: "2026-10-15", length: 4.4, width: 3.2, notes: "Acompanhamento registrado" }, { date: "2026-06-10", length: 4.1, width: 3.0, notes: "Registro inicial" }], description: "Nova documentação fotográfica recomendada para a próxima visita.", images: [], archived: false },
      { id: "L-0311", patientId: "P-10247", location: "Tórax · lado direito", view: "front", x: 55, y: 28, status: "stable", firstSeen: "2025-11-21", measurements: [{ date: "2026-10-12", length: 3.6, width: 3.1, notes: "Registro de acompanhamento" }, { date: "2026-04-01", length: 3.6, width: 3.0, notes: "Registro de acompanhamento" }], description: "Registro de acompanhamento longitudinal.", images: [], archived: false }
    ],
    treatments: [
      { id: "T-301", patientId: "P-10284", description: "Plano de acompanhamento dermatológico", startDate: "2026-04-08", endDate: "", status: "active", note: "Revisão de registros na próxima consulta." },
      { id: "T-302", patientId: "P-10279", description: "Acompanhamento clínico", startDate: "2026-05-20", endDate: "", status: "active", note: "" },
      { id: "T-303", patientId: "P-10261", description: "Acompanhamento fotográfico", startDate: "2026-06-10", endDate: "", status: "active", note: "" }
    ],
    exams: [
      { id: "E-122", patientId: "P-10284", type: "Dermatoscopia", date: "2026-10-02", result: "Registro vinculado à consulta para revisão profissional." },
      { id: "E-118", patientId: "P-10279", type: "Registro fotográfico", date: "2026-10-11", result: "Imagens documentais adicionadas ao prontuário demonstrativo." },
      { id: "E-109", patientId: "P-10261", type: "Dermatoscopia", date: "2026-06-10", result: "Registro vinculado à consulta." }
    ],
    suggestions: [
      { id: "AI-018", lesionId: "L-0245", type: "Possível correspondência temporal", oldLabel: "Registro · 08 abr 2026", newLabel: "Registro · 02 out 2026", score: 92, status: "pending", evidence: "Sugestão ilustrativa baseada nos registros vinculados. Verifique as imagens e o contexto clínico antes de decidir." },
      { id: "AI-019", lesionId: "L-0304", type: "Revisão de correspondência", oldLabel: "Registro · 10 jun 2026", newLabel: "Registro · 15 out 2026", score: 84, status: "pending", evidence: "Sugestão ilustrativa para demonstrar o fluxo de validação profissional." },
      { id: "AI-014", lesionId: "L-0246", type: "Possível correspondência temporal", oldLabel: "Registro · 08 abr 2026", newLabel: "Registro · 02 out 2026", score: 78, status: "accepted", evidence: "Sugestão demonstrativa validada na consulta anterior.", decisionAt: "2026-10-02", decisionBy: "Dra. Mariana Martins" }
    ],
    events: [
      { id: "EV-1", patientId: "P-10284", type: "visit", title: "Atendimento registrado", detail: "Consulta de acompanhamento", date: "2026-10-19T09:00:00", actor: "Dra. Mariana Martins" },
      { id: "EV-2", patientId: "P-10279", type: "visit", title: "Atendimento registrado", detail: "Consulta de acompanhamento", date: "2026-10-19T10:30:00", actor: "Dra. Mariana Martins" },
      { id: "EV-3", patientId: "P-10284", type: "lesion", title: "Evolução documentada", detail: "Lesão L-0245 · medida registrada", date: "2026-10-02T14:15:00", actor: "Dra. Mariana Martins" },
      { id: "EV-4", patientId: "P-10279", type: "image", title: "Registro fotográfico vinculado", detail: "Lesão L-0188", date: "2026-10-11T11:20:00", actor: "Dra. Mariana Martins" },
      { id: "EV-5", patientId: "P-10261", type: "visit", title: "Consulta concluída", detail: "Acompanhamento dermatológico", date: "2026-10-15T16:00:00", actor: "Dra. Mariana Martins" }
    ],
    audit: [
      { id: "AU-1", action: "Sugestão validada", entity: "AI-014", detail: "Decisão profissional registrada", actor: "Dra. Mariana Martins", date: "2026-10-02T14:30:00" },
      { id: "AU-2", action: "Consulta concluída", entity: "C-5502", detail: "Atendimento clínico registrado", actor: "Dra. Mariana Martins", date: "2026-10-19T10:45:00" },
      { id: "AU-3", action: "Paciente consultado", entity: "P-10284", detail: "Acesso ao prontuário demonstrativo", actor: "Dra. Mariana Martins", date: "2026-10-19T09:05:00" }
    ],
    reports: []
  };
}
