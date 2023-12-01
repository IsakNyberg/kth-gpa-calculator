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
  console.log(files);
  upload_file(files[0]);
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  console.log(file);
  upload_file(file);
});

function upload_file(file) {
  var pdfjsLib = window['pdfjs-dist/build/pdf'];
  pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdn.jsdelivr.net/npm/pdfjs-dist@2.6.347/build/pdf.worker.js';

  var reader = new FileReader();
  reader.onload = function (event) {
    var fileArray = new Uint8Array(event.target.result);
    pdfjsLib.getDocument(fileArray).promise.then(parse_pdf);
  };
  reader.readAsArrayBuffer(file);
}

function parse_pdf(pdf) {
  var totalPageCount = pdf.numPages;
  var promises = [];
  for (var currentPage = 1; currentPage <= totalPageCount; currentPage++) {
    var page = pdf.getPage(currentPage);
    promises.push(
      page.then(parse_page),
    );
  }

  return Promise.all(promises).then(function (pages) {
    const collapsedResult = pages.reduce((acc, value) => acc.concat(value), []);
    if (collapsedResult.length == 0) {
      console.log("No courses found");
      add_fail_text();
      return;
    }
    display_courses(collapsedResult);
    display_gpa(collapsedResult);
  });
}
function parse_page(page) {
  return page.getTextContent()
    .then(function (textContent) {
      let table_headers = ["name", "scope", "grade", "date", "note"]
      let courses = []
      for (let item of textContent.items) {

        if (
          table_headers.length == 0 &&
          item.height == 10
        ) {
          courses.push(item)
        }

        if (item.str.toLowerCase() == table_headers[0]) {
          table_headers.shift();
        }
      }
      return courses;
    })
    .then(function (courses) {
      // group by row
      const groupedItems = {};
      courses.forEach(item => {
        const h = item.transform[5];
        if (!groupedItems[h]) {
          groupedItems[h] = [];
        }
        groupedItems[h].push(item);
      });
      return groupedItems;
    })
    .then(function (groupedItems) {
      // filer out items that are not 6 in length
      const filteredItems = [];
      for (let key in groupedItems) {
        if (groupedItems[key].length == 6) {
          filteredItems.push(groupedItems[key]);
        } else {
          console.log('Item with length != 6 found:', groupedItems[key]);
        }
      }
      return filteredItems;
    })
    .then(function (filteredItems) {
      // create objects
      const objects = [];
      let counter = 0;
      for (let item of filteredItems) {
        counter++;
        objects.push({
          id: counter,
          name: item[0].str,
          scope: item[1].str,
          grade: item[3].str,
          is_graded: ["A", "B", "C", "D", "E", "Fx", "F"].includes(item[3].str),
          is_included: ["A", "B", "C", "D", "E", "Fx", "F"].includes(item[3].str),
          date: item[4].str,
          note: item[5].str,
        });
      }
      console.log("coureses found:", objects);
      return objects;
    })
    .catch(function (error) {
      add_fail_text();
      console.error('Error while parsing page:', error);
    });
}


function display_courses(courses) {
  const coursesContainer = document.getElementById('courses-container');

  coursesContainer.innerHTML = '';

  const table = document.createElement('table');
  table.classList.add('course-table');
  table.id = 'course-table';

  // Create table headers
  const headers = ['Include', 'Id', 'Course name', 'Scope', 'Grade', 'Date'];
  const headerRow = document.createElement('tr');
  headers.forEach(headerText => {
    const headerCell = document.createElement('th');
    headerCell.textContent = headerText;
    headerRow.appendChild(headerCell);
  });
  table.appendChild(headerRow);

  // Populate table with course data
  courses.forEach(course => {
    const row = document.createElement('tr');
    //create checkbox
    const checkboxCell = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = "checkbox";
    checkbox.checked = course.is_included;
    checkbox.disabled = !course.is_graded;
    checkbox.classList.add('table-checkbox');
    checkbox.onchange = function () {
      console.log("Checkbox changed:", course);
      course.is_included = checkbox.checked;
      display_gpa(courses);
    }
    checkboxCell.appendChild(checkbox);
    row.appendChild(checkboxCell);
    checkboxCell.classList.add('table-checkbox');

    const idCell = document.createElement('td');
    idCell.textContent = course.id;
    row.appendChild(idCell);
    idCell.classList.add('table-id');

    const nameCell = document.createElement('td');
    nameCell.textContent = course.name;
    row.appendChild(nameCell);
    nameCell.classList.add('table-name');

    const scopeCell = document.createElement('td');
    scopeCell.textContent = course.scope;
    scopeCell.classList.add('table-scope');
    row.appendChild(scopeCell);

    const gradeCell = document.createElement('td');
    gradeCell.textContent = course.grade;
    gradeCell.classList.add('table-grade'); // Center align grade
    row.appendChild(gradeCell);

    const dateCell = document.createElement('td');
    dateCell.textContent = course.date;
    dateCell.classList.add('table-date'); // Align date right
    row.appendChild(dateCell);

    table.appendChild(row);
  });

  coursesContainer.appendChild(table);

  return courses;
}

function add_course(courses) {
  var course = {
    id: courses.length + 1,
    name: "New course",
    scope: "0",
    grade: "A",
    is_graded: true,
    is_included: true,
    date: "",
    note: "",
  }
  courses.push(course);

  const table = document.getElementById('course-table');
  const row = document.createElement('tr');

  let update = function () {
    // change course object
    course.id = parseInt(row.cells[1].textContent),
    course.name = row.cells[2].textContent,
    course.scope = row.cells[3].textContent,
    course.grade = row.cells[4].textContent,
    course.is_graded = ["A", "B", "C", "D", "E", "Fx", "F"].includes(row.cells[4].textContent),
    course.is_included = row.cells[0].querySelector('input[type="checkbox"]').checked,
    course.date = row.cells[5].textContent,
    course.note = "",
    console.log("New/updated course:", course);

    if (!["A", "B", "C", "D", "E", "Fx", "F"].includes(row.cells[4].textContent)) {
      console.log("Invalid course grade:", course, row.cells[4].textContent);
      row.cells[4].style.backgroundColor = "red";
    } else {
      row.cells[4].style.backgroundColor = "white";
    }

    if (isNaN(parseFloat(row.cells[3].textContent.replace(',', '.')))) {
      console.log("Invalid course scope:", course, row.cells[3].textContent);
      row.cells[3].style.backgroundColor = "red";
    } else {
      row.cells[3].style.backgroundColor = "white";
    }

    display_gpa(courses);
  }

  
  const checkboxCell = document.createElement('td');
  const checkbox = document.createElement('input');
  checkbox.type = "checkbox";
  checkbox.checked = true;
  checkbox.disabled = false;
  checkbox.classList.add('table-checkbox');
  checkbox.onchange = update;
  checkboxCell.appendChild(checkbox);
  checkboxCell.classList.add('table-checkbox');
  row.appendChild(checkboxCell);


  const idCell = document.createElement('td');
  idCell.textContent = courses.length + 1;
  idCell.classList.add('table-id');
  row.appendChild(idCell);
  const nameCell = document.createElement('td');
  nameCell.textContent = "New course";
  nameCell.contentEditable = true;
  nameCell.classList.add('table-name');
  row.appendChild(nameCell);

  const scopeCell = document.createElement('td');
  scopeCell.textContent = "0";
  scopeCell.contentEditable = true;
  scopeCell.classList.add('table-scope');
  scopeCell.addEventListener('input', update);
  row.appendChild(scopeCell);

  const gradeCell = document.createElement('td');
  gradeCell.textContent = "A";
  gradeCell.contentEditable = true;
  gradeCell.classList.add('table-grade');
  gradeCell.addEventListener('input', update);
  row.appendChild(gradeCell);

  const dateCell = document.createElement('td');
  dateCell.textContent = "";
  row.appendChild(dateCell);
  
  // append row to second to last row
  table.insertBefore(row, table.rows[table.rows.length - 1]);
  
}


function display_gpa(courses) {
  console.log("Calculating gpa for courses:", courses);
  let total_credits = 0;
  let counted_credits = 0;
  let total_gpa = 0;
  let average_gpa = 0;
  let grade_dict = {
    "A": 5,
    "B": 4.5,
    "C": 4,
    "D": 3.5,
    "E": 3,
    "Fx": 0,
    "F": 0,
  }
  for (let course of courses) {
    let credits = parseFloat(course.scope.replace(',', '.'));
    if (isNaN(credits)) {
      console.log("Unknown scope:", course);
      continue;
    }
    total_credits += credits;

    if (course.grade in grade_dict && course.is_included) {
      var gpa = grade_dict[course.grade];
      counted_credits += credits;
      total_gpa += gpa * credits;
    } else if (!course.grade in ["A", "B", "C", "D", "E", "Fx", "F"]) {
      console.log("Invalid course grade:", course);
    }
  }
  average_gpa = total_gpa / counted_credits;

  console.log("total credits:", total_credits, "counted credits:", counted_credits, "gpa:", average_gpa);

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
  scopeCell.textContent = counted_credits + ' / ' + total_credits;
  scopeCell.classList.add('table-scope');
  row.appendChild(scopeCell);

  const gradeCell = document.createElement('td');
  gradeCell.textContent = average_gpa.toFixed(2);
  gradeCell.classList.add('table-grade');
  row.appendChild(gradeCell);

  // make a button that when prcessed creates a new row where the name, scope and grade are editable
  const dateCell = document.createElement('td');
  const button = document.createElement('button');
  button.textContent = "Add course";
  button.classList.add('add-course-butt');
  button.onclick = function () {
    console.log("Add course pressed", courses);
    add_course(courses);
    display_gpa(courses);
  }

  dateCell.appendChild(button);
  row.appendChild(dateCell);
  table.appendChild(row);

}

function add_fail_text() {
  let div = document.getElementById('error-text');
  div.classList.add("calculator-box");
  div.innerHTML = "Failed to parse courses from pdf. Please check that the pdf is in the correct format and try again. \
  Make sure the type is 'Official transcript of records' and the language is 'English', do not check any checkbox under the 'Include' section.";
}