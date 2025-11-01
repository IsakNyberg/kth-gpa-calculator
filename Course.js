
export default class Course {
  constructor(data = {}, gradeTable) {
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
    this.scope = scope
    this.grade = grade;
    this.gradeTable = gradeTable;
    this.is_graded = !!Object.prototype.hasOwnProperty.call(this.gradeTable, String(this.grade));
    this.is_included = this.is_graded || is_custom;
    this.is_custom = !!is_custom;
    this.date = date;
    this.note = note;
  }

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

  get credits() {
    if (typeof this.scope === 'number') return this.scope;
    const v = parseFloat(String(this.scope).replace(',', '.'));
    return v;
  }

  get gradeValue() {
    if (!this.grade) return null;
    if (Object.prototype.hasOwnProperty.call(this.gradeTable, this.grade)) {
      return this.gradeTable[this.grade];
    }
    const upper = String(this.grade).toUpperCase();
    if (Object.prototype.hasOwnProperty.call(this.gradeTable, upper)) {
      return this.gradeTable[upper];
    }
    return null;
  }

  isValidGrade() {
    if (!this.grade) return false;
    if (Object.prototype.hasOwnProperty.call(this.gradeTable, this.grade)) return true;
    const upper = String(this.grade).toUpperCase();
    return Object.prototype.hasOwnProperty.call(this.gradeTable, upper);
  }

  toggleIncluded() {
    this.is_included = !this.is_included;
    return this.is_included;
  }

  validate() {
    const errors = [];
    const credits = this.credits;
    if (isNaN(credits)) errors.push('Invalid scope/credits');
    if (!this.isValidGrade()) errors.push('Invalid grade');
    return { ok: errors.length === 0, errors };
  }
}
