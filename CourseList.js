import Course from './Course.js';

export default class CourseList {
  constructor(courses = []) {
    this.courses = [];
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

  addCustomCourse(gradeTable) {
    const course = new Course({
      id: this.courses.length + 1,
      name: 'Custom Course',
      scope: 0,
      grade: 'X',
      date: '',
      note: 'Custom',
      is_custom: true,
    }, gradeTable);
    this.courses.push(course);
    return course;
  }

  // Find course by id
  findById(id) {
    return this.courses.find(c => c.id === id) || null;
  }

  // Sort the internal array by field (id, name, scope, grade, date, is_included)
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

  // Total credits across all courses
  totalCredits() {
    return this.courses.reduce((s, c) => {
      const v = c.credits;
      return s + (isNaN(v) ? 0 : v);
    }, 0);
  }

  // courses with valid grade and included in GPA calculation
  countedCredits() {
    return this.courses.reduce((s, c) => {
      const v = c.credits;
      return s + ((c.gradeValue !== null && c.is_included && !isNaN(v)) ? v : 0);
    }, 0);
  }

  averageGpa() {
    const totals = this.courses.reduce((acc, c) => {
      const v = c.credits;
      if (c.gradeValue !== null && c.is_included && !isNaN(v)) {
        acc.counted += v;
        acc.total += c.gradeValue * v;
      }
      return acc;
    }, { counted: 0, total: 0 });
    return totals.counted === 0 ? 0 : totals.total / totals.counted;
  }
}

