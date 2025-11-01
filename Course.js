// Course model class used by the GPA calculator
// Matches the plain object shape used in `script.js`:
// { id, name, scope, grade, is_graded, is_included, date, note }

const DEFAULT_GRADE_TABLE = {
  'A': 5,
  'B': 4.5,
  'C': 4,
  'D': 3.5,
  'E': 3,
  'Fx': 0,
  'F': 0,
};

export default class Course {
  // constructor(dataObject, gradeTable)
  // dataObject: { id, name, scope, grade, date, note, is_custom }
  // gradeTable: e.g. { A:5, B:4.5, ... }
  constructor(data = {}, gradeTable = DEFAULT_GRADE_TABLE) {
    const {
      id = null,
      name = '',
      scope = 0,
      grade = '',
      date = '',
      note = '',
      is_custom = false,
    } = data;

    this.id = id;
    this.name = name;
    this.scope = scope; // intentional: may be number or string depending on source
    this.grade = grade;
    this.gradeTable = gradeTable || DEFAULT_GRADE_TABLE;
    // determine graded/included from grade table by default
    this.is_graded = !!Object.prototype.hasOwnProperty.call(this.gradeTable, String(this.grade));
    this.is_included = this.is_graded;
    this.is_custom = !!is_custom;
    this.date = date;
    this.note = note;
  }

  // Return a plain JS object representation (useful for serialization)
  toObject() {
    return {
      id: this.id,
      name: this.name,
      scope: this.scope,
      grade: this.grade,
      is_graded: this.is_graded,
      is_included: this.is_included,
      is_custom: this.is_custom,
      date: this.date,
      note: this.note,
    };
  }

  // Numeric credits (float). Returns NaN if not parseable.
  get credits() {
    if (typeof this.scope === 'number') return this.scope;
    const v = parseFloat(String(this.scope).replace(',', '.'));
    return v;
  }

  // Map grade string to numeric value per existing logic
  get gradeValue() {
    // Use instance's grade table; allow case-insensitive keys
    if (!this.grade) return null;
    // Prefer exact key, then uppercase key
    if (Object.prototype.hasOwnProperty.call(this.gradeTable, this.grade)) {
      return this.gradeTable[this.grade];
    }
    const upper = String(this.grade).toUpperCase();
    if (Object.prototype.hasOwnProperty.call(this.gradeTable, upper)) {
      return this.gradeTable[upper];
    }
    return null;
  }

  // Convenience: is the grade one of the recognized letter grades?
  isValidGrade() {
    if (!this.grade) return false;
    if (Object.prototype.hasOwnProperty.call(this.gradeTable, this.grade)) return true;
    const upper = String(this.grade).toUpperCase();
    return Object.prototype.hasOwnProperty.call(this.gradeTable, upper);
  }

  // Toggle whether this course is included in GPA calculation
  toggleIncluded() {
    this.is_included = !this.is_included;
    return this.is_included;
  }

  // Validate that scope and grade are in acceptable formats
  validate() {
    const errors = [];
    const credits = this.credits;
    if (isNaN(credits)) errors.push('Invalid scope/credits');
    if (!this.isValidGrade()) errors.push('Invalid grade');
    return { ok: errors.length === 0, errors };
  }
}
