import { describe, expect, it } from "vitest";
import {
  extractEducationLevel,
  extractEmail,
  extractName,
  extractPhone,
  extractYearsExperience,
  findSkills,
} from "@/lib/extract";
import { skillAliases } from "@/lib/synonyms";

const NOW = new Date("2026-11-01T00:00:00Z");

describe("findSkills", () => {
  it("matches case-insensitively and reports what is missing", () => {
    const result = findSkills("Skills: python, SQL, Docker", ["Python", "SQL", "Rust"]);
    expect(result.matched).toEqual(["Python", "SQL"]);
    expect(result.missing).toEqual(["Rust"]);
  });

  it("does not match a skill inside a longer one", () => {
    const result = findSkills("Skills: JavaScript, C", ["Java", "C++"]);
    expect(result.matched).toEqual([]);
  });

  it("matches C++ and C# literally", () => {
    expect(findSkills("Skills: C++, C#", ["C++", "C#"]).matched).toEqual(["C++", "C#"]);
  });

  it("matches synonyms in either direction", () => {
    expect(findSkills("Built services in Golang", ["Go"]).matched).toEqual(["Go"]);
    expect(findSkills("Built services in Go", ["Golang"]).matched).toEqual(["Golang"]);
    expect(findSkills("Deployed on k8s", ["Kubernetes"]).matched).toEqual(["Kubernetes"]);
    expect(findSkills("Strong JS skills", ["JavaScript"]).matched).toEqual(["JavaScript"]);
    expect(findSkills("Used sklearn daily", ["scikit-learn"]).matched).toEqual(["scikit-learn"]);
  });

  it("reports the skill as the recruiter wrote it, not the alias found", () => {
    expect(findSkills("Postgres", ["PostgreSQL"]).matched).toEqual(["PostgreSQL"]);
  });

  it("does not expand JavaScript into Java via synonyms", () => {
    expect(findSkills("JS developer", ["Java"]).matched).toEqual([]);
  });
});

describe("skillAliases", () => {
  it("returns the skill alone when it has no synonyms", () => {
    expect(skillAliases("Rust")).toEqual(["Rust"]);
  });

  it("keeps the original spelling first", () => {
    expect(skillAliases("Go")[0]).toBe("Go");
    expect(skillAliases("Go")).toContain("golang");
  });
});

describe("contact fields", () => {
  const text = "Asha Verma\nasha.verma@mail.com | +91 98765 43210\nML Engineer";

  it("extracts the name from the first line", () => {
    expect(extractName(text, "resume.pdf")).toBe("Asha Verma");
  });

  it("extracts email and phone", () => {
    expect(extractEmail(text)).toBe("asha.verma@mail.com");
    expect(extractPhone(text)).toContain("98765");
  });

  it.each([
    ["+91 98765 43210", "+91 98765 43210"],
    ["(415) 555-0132", "(415) 555-0132"],
    ["415.555.0132", "415.555.0132"],
    ["+44 20 7946 0958", "+44 20 7946 0958"],
    ["9876543210", "9876543210"],
  ])("extracts phone %s", (input, expected) => {
    expect(extractPhone(`Name\nPhone: ${input}\nEngineer`)).toBe(expected);
  });

  it("does not treat a year range as a phone number", () => {
    expect(extractPhone("Acme (2016 - 2021), Beta (2021 - 2024)")).toBeNull();
  });

  it("returns null when there is no email", () => {
    expect(extractEmail("no contact here")).toBeNull();
  });
});

describe("extractEducationLevel", () => {
  it.each([
    ["M.Tech in Computer Science", "masters"],
    ["B.Sc Statistics", "bachelors"],
    ["PhD in Physics", "phd"],
    ["Diploma in Design", "diploma"],
    ["Self-taught", "none"],
  ])("%s -> %s", (text, level) => {
    expect(extractEducationLevel(text)).toBe(level);
  });
});

describe("extractYearsExperience", () => {
  it("prefers an explicit claim", () => {
    expect(extractYearsExperience("Engineer with 6 years of experience.", NOW)).toBe(6);
  });

  it("falls back to employment date ranges", () => {
    const years = extractYearsExperience("Acme (Jan 2020 - Jan 2023)", NOW);
    expect(years).toBeCloseTo(3, 0);
  });

  it("does not double-count overlapping roles", () => {
    const years = extractYearsExperience(
      "Acme (Jan 2020 - Jan 2023)\nSide gig (Jan 2021 - Jan 2022)",
      NOW,
    );
    expect(years).toBeCloseTo(3, 0);
  });

  it("returns null with no signal", () => {
    expect(extractYearsExperience("Hello world", NOW)).toBeNull();
  });
});
