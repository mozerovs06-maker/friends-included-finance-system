import type { Employee } from "./types";

export const employees: Employee[] = [
  {
    id: "svetlana",
    name: "Svetlana de Monte Carlo",
    role: "manager",
    active: true,
  },
  {
    id: "richard",
    name: "Richard “Call Me Dick” Darling",
    role: "salesperson",
    active: true,
  },
  {
    id: "anastasia",
    name: "Anastasia Ferrari",
    role: "salesperson",
    active: true,
  },
  {
    id: "jean-claude",
    name: "Jean-Claude Bērziņš",
    role: "salesperson",
    active: true,
  },
  {
    id: "kevin",
    name: "Kevin von Whatever",
    role: "expense_reporter",
    active: true,
  },
];

export function employee(id: string) {
  return employees.find((entry) => entry.id === id);
}
