import Course from './Course.js';

export default class CourseList {
  constructor(courses = []) {
    // ensure we store Course instances
    this.courses = courses.map(c => c);
  }

  // number of courses
  get length() {
    return this.courses.length;
  }

  // Add a Course instance or plain object
  add(course) {
    if (!(course instanceof Course)) {
      throw new Error('Argument must be an instance of Course');
    }
    course.id = this.courses.length + 1;
    this.courses.push(course);
    return course;
  }

  fromArray(arr) {
    arr.forEach(c => this.add(c));
  }

  empty() {
    this.courses = [];
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

  // Counted credits (only included courses with valid grade)
  countedCredits() {
    return this.courses.reduce((s, c) => {
      const v = c.credits;
      return s + ((c.gradeValue !== null && c.is_included && !isNaN(v)) ? v : 0);
    }, 0);
  }

  // Average GPA using gradeValue and counted credits
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


  // Replace internal array
  setAll(courses) {
    this.courses = courses.map(c => (c));
  }

  // Build and return a table HTMLElement representing the courses list.
  // The returned element is not automatically inserted into the DOM.
  displayCoursesElement() {
    const table = document.createElement('table');
    table.classList.add('course-table');
    table.id = 'course-table';

    // Create table headers
    const headers = ['Include', 'Id', 'Course name', 'Scope', 'Grade', 'Date'];
    const headerRow = document.createElement('tr');
    headers.forEach(headerText => {
      const headerCell = document.createElement('th');
      headerCell.onclick = () => {
        let field;
        switch (headerText) {
          case 'Id': field = 'id'; break;
          case 'Course name': field = 'name'; break;
          case 'Scope': field = 'scope'; break;
          case 'Grade': field = 'grade'; break;
          case 'Date': field = 'date'; break;
          case 'Include': field = 'is_included'; break;
          default: field = null;
        }
        if (!field) return;
        // toggle sort order if same field
        if (this._lastSortField === field) {
          this._lastAscending = !this._lastAscending;
        } else {
          this._lastSortField = field;
          this._lastAscending = true;
        }
        this.sortBy(field, this._lastAscending);
        // replace current table with a newly built one
        const newTable = this.displayCoursesElement();
        table.replaceWith(newTable);
        // try to update GPA display if global function exists
        if (typeof display_gpa === 'function') display_gpa(this.courses);
      };
      headerCell.textContent = headerText;
      headerRow.appendChild(headerCell);
    });
    table.appendChild(headerRow);

    // Populate table with course data
    this.courses.forEach(course => {
      const row = document.createElement('tr');

      const checkboxCell = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = course.is_included;
      checkbox.disabled = !course.is_graded;
      checkbox.classList.add('table-checkbox');
      checkbox.onchange = () => {
        course.is_included = checkbox.checked;
        if (typeof display_gpa === 'function') display_gpa(this.courses);
      };
      checkboxCell.appendChild(checkbox);
      row.appendChild(checkboxCell);

      const idCell = document.createElement('td');
      idCell.textContent = course.id;
      idCell.classList.add('table-id');
      row.appendChild(idCell);

      const nameCell = document.createElement('td');
      nameCell.textContent = course.name;
      nameCell.classList.add('table-name');
      row.appendChild(nameCell);

      const scopeCell = document.createElement('td');
      scopeCell.textContent = course.scope;
      scopeCell.classList.add('table-scope');
      row.appendChild(scopeCell);

      const gradeCell = document.createElement('td');
      gradeCell.textContent = course.grade;
      gradeCell.classList.add('table-grade');
      row.appendChild(gradeCell);

      const dateCell = document.createElement('td');
      dateCell.textContent = course.date;
      dateCell.classList.add('table-date');
      row.appendChild(dateCell);

      table.appendChild(row);
    });

    return table;
  }
}

