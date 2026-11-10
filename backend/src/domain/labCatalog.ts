export interface LabResultFieldDefinition {
  key: string;
  label: string;
  unit?: string;
  referenceRange?: string;
}

export interface LabCatalogueEntry {
  code: string;
  name: string;
  common: boolean;
  /** No department assignments exist in the source application. */
  departments: string[];
  /** Direct patient self-ordering is not enabled without clinic authorization. */
  directBookingEligible: boolean;
  resultFields: LabResultFieldDefinition[];
}

/**
 * Supported catalogue entries are derived from test names already used by the
 * application seed data. No new tests, units, reference ranges, or department
 * mappings are asserted here.
 */
export const labCatalogue: LabCatalogueEntry[] = [
  {
    code: "cbc",
    name: "Complete blood count",
    common: true,
    departments: [],
    directBookingEligible: false,
    resultFields: [
      { key: "haemoglobin", label: "Haemoglobin" },
      { key: "whiteBloodCellCount", label: "White blood cell count" },
      { key: "plateletCount", label: "Platelet count" },
    ],
  },
  {
    code: "lipid-panel",
    name: "Lipid panel",
    common: true,
    departments: [],
    directBookingEligible: false,
    resultFields: [
      { key: "totalCholesterol", label: "Total cholesterol" },
      { key: "hdl", label: "HDL" },
      { key: "ldl", label: "LDL" },
      { key: "triglycerides", label: "Triglycerides" },
    ],
  },
  {
    code: "basic-metabolic-panel",
    name: "Basic metabolic panel",
    common: false,
    departments: [],
    directBookingEligible: false,
    resultFields: [],
  },
  {
    code: "hba1c",
    name: "HbA1c",
    common: false,
    departments: [],
    directBookingEligible: false,
    resultFields: [],
  },
  {
    code: "thyroid-panel",
    name: "Thyroid panel",
    common: false,
    departments: [],
    directBookingEligible: false,
    resultFields: [],
  },
  {
    code: "troponin-i",
    name: "Troponin I",
    common: false,
    departments: [],
    directBookingEligible: false,
    resultFields: [],
  },
  {
    code: "comprehensive-metabolic-panel",
    name: "Comprehensive metabolic panel",
    common: false,
    departments: [],
    directBookingEligible: false,
    resultFields: [],
  },
];

export const labResultTemplate = (code: unknown) =>
  labCatalogue.find((entry) => entry.code === code)?.resultFields ?? [];

export function catalogueForDepartment(department?: string) {
  const normalized = String(department ?? "").trim().toLowerCase();
  return [...labCatalogue].sort((a, b) => {
    const aDepartment = normalized && a.departments.some((value) => value.toLowerCase() === normalized) ? 0 : 1;
    const bDepartment = normalized && b.departments.some((value) => value.toLowerCase() === normalized) ? 0 : 1;
    return aDepartment - bDepartment || Number(b.common) - Number(a.common) || a.name.localeCompare(b.name);
  });
}
