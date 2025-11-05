import Course from './Course.js';

export default class CourseList {
  constructor(courses = [], gradeTable) {
    if (!gradeTable) {
      throw new Error('CourseList requires a grade table upon initialization');
    }
    this.courses = [];
    this.setGradeTable(this.gradeTable);
    this.gradeTable = gradeTable;
    courses.forEach(c => this.add(c));
    this.sortBy('date', true);
    this.resetIndexes();

  }

  get length() {
    return this.courses.length;
  }

  add(course) {
    if (!(course instanceof Course)) {
      throw new Error('Argument must be an instance of Course');
    }
    course.id = this.courses.length + 1;
    this.courses.push(course);
    const is_included = course.applyGradeTable(this.gradeTable);
    course.is_included = is_included;
    return course;
  }

  empty() {
    this.courses = [];
  }

  resetIndexes() {
    this.courses.forEach((c, index) => {
      c.id = index + 1;
    });
  }

  addCustomCourse() {
    const course = new Course({
      id: this.courses.length + 1,
      name: 'Custom Course',
      scope: 0,
      grade: 'X',
      date: '',
      note: 'Custom',
      is_custom: true,
    });
    this.courses.push(course);
    if (this.gradeTable) course.applyGradeTable(this.gradeTable);
    return course;
  }

  sortBy(field, ascending = true) {
    const cmp = (a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    };
    this.courses.sort(cmp);
    if (!ascending) this.courses.reverse();
    return this.courses;
  }

  totalCredits() {
    return this.courses.reduce((s, c) => {
      const v = c.scope;
      return s + v;
    }, 0);
  }

  includedCredits() {
    return this.courses.reduce((s, c) => {
      const v = c.scope_included;
      return s + v;
    }, 0);
  }

  averageGpa() {
    if (!this.gradeTable) return null;
    this.courses.forEach((c) => c.applyGradeTable(this.gradeTable));

    const totals = this.courses.reduce((acc, c) => {
      const s = c.scope_graded;
      const gv = c.grade_point_value;
      const acc_s = acc.gradedCredits;
      const acc_t = acc.total;
      return {
        gradedCredits: acc_s + s,
        total: acc_t + gv * s,
      };
    }, { gradedCredits: 0, total: 0 });
    return totals.gradedCredits === 0 ? 0 : totals.total / totals.gradedCredits;
  }

  setGradeTable(gradeTable) {
    this.gradeTable = gradeTable || null;
    console.log('Setting grade table:', this.gradeTable);
    let gradedCount = 0;
    this.courses.forEach((c) => {
      const wasGraded = c.applyGradeTable(this.gradeTable);
      if (wasGraded) gradedCount += 1;
      c.is_included = c.is_valid;
    });
    return gradedCount;
  }
}

