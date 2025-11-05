import Course from './Course.js';
import CourseList from './CourseList.js';


const GRADE_TABLE_AE = {
  'A': 5.0,
  'B': 4.5,
  'C': 4.0,
  'D': 3.5,
  'E': 3.0,
};

const GRADE_TABLE_53 = {
  '5': 5.0,
  '4': 4.0,
  '3': 3.0,
};

const GRADE_TABLE_VG = {
  'VG': 5.0,
  'G': 3.0,
};

let GRADE_TABLE = GRADE_TABLE_AE;

let COURSE_LIST = new CourseList([], GRADE_TABLE);
window.courseList = COURSE_LIST;


function applyBestGradeTable(courseList) {
  let best_table = null;
  let best_match = -1;
  for (let table of [GRADE_TABLE_AE, GRADE_TABLE_53, GRADE_TABLE_VG]) {
    let match_count = courseList.setGradeTable(table);
    if (match_count > best_match) {
      best_match = match_count;
      best_table = table;
    }
  }
  courseList.setGradeTable(best_table);
}

// Wire grade table selector UI (if present) to update the active grade table
document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('grade-table-select');
  if (!select) return;
  select.value = 'ae';
  select.addEventListener('change', (e) => {
    const v = e.target.value;
    if (v === 'ae') GRADE_TABLE = GRADE_TABLE_AE;
    else if (v === '53') GRADE_TABLE = GRADE_TABLE_53;
    else if (v === 'vg') GRADE_TABLE = GRADE_TABLE_VG;
    COURSE_LIST.setGradeTable(GRADE_TABLE);

    const container = document.getElementById('courses-container');
    container.innerHTML = '';
    if (COURSE_LIST.length > 0) {
      container.appendChild(displayCoursesElement(COURSE_LIST));
      display_gpa(COURSE_LIST.courses);
    }
  });
});

const fileUploader = document.getElementById('fileUploader');
const fileInput = document.getElementById('fileInput');

fileUploader.addEventListener('dragover', (e) => {
  e.preventDefault();
  fileUploader.classList.add('dragover');
});

fileUploader.addEventListener('dragleave', () => {
  fileUploader.classList.remove('dragover');
});

fileUploader.addEventListener('drop', (e) => {
  e.preventDefault();
  fileUploader.classList.remove('dragover');
  const files = e.dataTransfer.files;
  upload_file(files[0]);
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  upload_file(file);
});

function upload_file(file) {
  var pdfjsLib = window['pdfjs-dist/build/pdf'];
  pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdn.jsdelivr.net/npm/pdfjs-dist@2.6.347/build/pdf.worker.js';
  COURSE_LIST.empty();
  var reader = new FileReader();
  reader.onload = function (event) {
    var fileArray = new Uint8Array(event.target.result);
    pdfjsLib.getDocument(fileArray).promise.then(parse_pdf);
  };
  reader.readAsArrayBuffer(file);
};

function parse_pdf(pdf) {
  var totalPageCount = pdf.numPages;
  var promises = [];
  for (var currentPage = 1; currentPage <= totalPageCount; currentPage++) {
    var page = pdf.getPage(currentPage);
    promises.push(page.then(parse_pdf_page));
  }

  return Promise.all(promises).then(function (pages) {
    COURSE_LIST = new CourseList(pages.flat(), GRADE_TABLE);
    window.courseList = COURSE_LIST;
    if (COURSE_LIST.length === 0) {
      console.log("No courses found");
      add_fail_text();
      return;
    }
    applyBestGradeTable(COURSE_LIST);
    const tableEl = displayCoursesElement(COURSE_LIST);
    const coursesContainer = document.getElementById('courses-container');
    coursesContainer.innerHTML = '';
    coursesContainer.appendChild(tableEl);
    display_gpa(COURSE_LIST.courses);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });
};

async function parse_pdf_page(page) {
  try {
    const textContent = await page.getTextContent();

    let table_headers = [
      ["name", "benämning"],
      ["scope", "omfattning"],
      ["grade", "betyg"],
      ["date", "datum"],
      ["note", "not"],
    ];

    // collect candidate text items once headers are passed
    let possible_courses = [];
    for (let item of textContent.items) {
      if (table_headers.length === 0) {
        if (item.height == 10) {
          possible_courses.push(item);
        }
      } else {
        if (table_headers[0].includes(item.str.toLowerCase())) {
          table_headers.shift();
        }
      }
    }

    // group by vertical position (row)
    const groupedItems = {};
    possible_courses.forEach(item => {
      const h = Math.round(item.transform[5]);
      if (!groupedItems[h]) groupedItems[h] = [];
      groupedItems[h].push(item);
    });

    // keep only rows with 6 or 7 items
    const filteredItems = [];
    for (let key in groupedItems) {
      if (groupedItems[key].length == 6 || groupedItems[key].length == 7) {
        if (groupedItems[key].length == 7) {
          groupedItems[key].splice(0, 1);
        }
        filteredItems.push(groupedItems[key]);
      } else {
        console.log('Item with length != 6 found:', groupedItems[key]);
      }
    }
    // map to Course objects
    const objects = filteredItems.map(item => new Course({
      id: null,
      name: item[0].str,
      scope: item[1].str.replace(',', '.'),
      grade: item[3].str,
      date: item[4].str,
      note: item[5].str,
    })).filter(c => c.name.length > 0 && !isNaN(c.scope));
    console.log("courses found on page:", objects);
    return objects;
  } catch (error) {
    add_fail_text();
    console.error('Error while parsing page:', error);
    return [];
  }
};

function display_gpa(courses) {
  console.log("Calculating gpa for courses:", courses);
  const gpa = COURSE_LIST.averageGpa();
  const total_credits = COURSE_LIST.totalCredits();
  const included_credits = COURSE_LIST.includedCredits();

  const table = document.getElementById('course-table');
  if (table.rows[table.rows.length - 1].cells[2].textContent == "Total HP and GPA") {
    table.deleteRow(-1);
  }
  const row = document.createElement('tr');

  const checkboxCell = document.createElement('td');
  row.appendChild(checkboxCell);
  const idCell = document.createElement('td');
  row.appendChild(idCell);

  const nameCell = document.createElement('td');
  nameCell.textContent = "Total HP and GPA";
  row.appendChild(nameCell);
  nameCell.classList.add('table-name');

  const scopeCell = document.createElement('td');
  scopeCell.textContent = included_credits + ' / ' + total_credits;
  scopeCell.classList.add('table-scope');
  row.appendChild(scopeCell);

  const gradeCell = document.createElement('td');
  gradeCell.textContent = gpa.toFixed(2);
  gradeCell.classList.add('table-grade');
  row.appendChild(gradeCell);

  // make a button that when prcessed creates a new row where the name, scope and grade are editable
  const dateCell = document.createElement('td');
  const button = document.createElement('button');
  button.textContent = "Add course";
  button.classList.add('add-course-butt');
  button.onclick = function () {
    COURSE_LIST.addCustomCourse();
    const container = document.getElementById('courses-container');
    container.innerHTML = '';
    container.appendChild(displayCoursesElement(COURSE_LIST));
    display_gpa(COURSE_LIST.courses);
  }

  dateCell.appendChild(button);
  row.appendChild(dateCell);
  table.appendChild(row);
};

function add_fail_text() {
  let div = document.getElementById('error-text');
  div.classList.add("calculator-box");
  div.innerHTML = "Failed to parse courses from pdf. Please check that the pdf \
  is in the correct format and try again. Make sure the type is 'Official \
  transcript of records' and the language is 'English', do not check any \
  checkbox under the 'Include' section.".replace(/'(.*?)'/g, '<i>$1</i>');
  // make the div flash red
  div.style.backgroundColor = "#FAA0A0"
  setTimeout(function () {
    div.style.backgroundColor = "white";
  }, 200);
  setTimeout(function () {
    div.style.backgroundColor = "#FAA0A0"
  }, 400);
  setTimeout(function () {
    div.style.backgroundColor = "white";
  }, 600);
};

// Move rendering into script.js: create a table element for a CourseList
function displayCoursesElement(courseList) {
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
      if (courseList._lastSortField === field) {
        courseList._lastAscending = !courseList._lastAscending;
      } else {
        courseList._lastSortField = field;
        courseList._lastAscending = true;
      }
      courseList.sortBy(field, courseList._lastAscending);
      // replace current table with a newly built one
      const newTable = displayCoursesElement(courseList);
      table.replaceWith(newTable);
      // ensure the GPA summary/add row is appended for the new table
      display_gpa(courseList.courses);
    };
    headerCell.textContent = headerText;
    headerRow.appendChild(headerCell);
  });
  table.appendChild(headerRow);

  courseList.courses.forEach(course => {
    const row = document.createElement('tr');

    const checkboxCell = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = course.is_included;
    checkbox.disabled = !course.is_graded;
    checkbox.classList.add('table-checkbox');
    checkbox.onchange = () => {
      course.is_included = checkbox.checked;
      display_gpa(courseList.courses);
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
    // editable if custom
    if (course.is_custom) {
      nameCell.contentEditable = true;
      nameCell.addEventListener('input', () => {
        course.name = nameCell.textContent;
        display_gpa(courseList.courses);
      });
    }
    row.appendChild(nameCell);

    const scopeCell = document.createElement('td');
    scopeCell.textContent = course.scope;
    scopeCell.classList.add('table-scope');
    if (course.is_custom) {
      scopeCell.contentEditable = true;
      scopeCell.addEventListener('input', () => {
        course.scope = parseFloat(String(scopeCell.textContent).replace(',', '.'));
        course.is_graded = course.applyGradeTable(courseList.gradeTable);
        course.is_included = course.is_valid;

        scopeCell.style.backgroundColor = isNaN(course.scope) ? 'red' : 'white';
        checkbox.checked = course.is_valid;
        checkbox.disabled = !course.is_valid;
        display_gpa(courseList.courses);
      });
    }
    row.appendChild(scopeCell);

    const gradeCell = document.createElement('td');
    gradeCell.textContent = course.grade;
    gradeCell.classList.add('table-grade');
    if (course.is_custom) {
      gradeCell.contentEditable = true;
      gradeCell.addEventListener('input', () => {
        course.grade = gradeCell.textContent;
        course.is_graded = course.applyGradeTable(courseList.gradeTable);
        course.is_included = course.is_valid;

        gradeCell.style.backgroundColor = course.is_graded ? 'white' : 'red';
        checkbox.checked = course.is_valid;
        checkbox.disabled = !course.is_valid;
        display_gpa(courseList.courses);
      });
    }
    row.appendChild(gradeCell);

    const dateCell = document.createElement('td');
    dateCell.textContent = course.date;
    dateCell.classList.add('table-date');
    row.appendChild(dateCell);

    table.appendChild(row);
  });

  return table;
}
