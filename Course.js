
export default class Course {
  constructor(data = {}) {
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
    this.scope = parseFloat(String(scope).replace(',', '.'));
    this.grade = grade;
    this.is_graded = false;
    this.is_included = !!is_custom && !isNaN(this.scope) && this.scope >= 0;
    this.is_custom = !!is_custom;
    this.date = date;
    this.note = note;
    this.grade_point_value = null;
  }

  get scope_included() {
    return this.is_included ? this.scope : 0;
  }

  get scope_graded() {
    return this.is_graded && this.is_included ? this.scope : 0;
  }

  get is_valid() {
    return !isNaN(this.scope) && this.scope > 0 && this.is_graded;
  }

  applyGradeTable(gradeTable) {
    this.grade_point_value = gradeTable[this.grade.toUpperCase()] || null;
    this.is_graded = !!this.grade_point_value;
    if (!this.is_graded) {
      this.is_included = false;
    }
    return this.is_graded;
  }
}
