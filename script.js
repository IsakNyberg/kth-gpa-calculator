

document.getElementById('file-upload-input').addEventListener('change', function () {
    var file = this.files[0];
    var pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdn.jsdelivr.net/npm/pdfjs-dist@2.6.347/build/pdf.worker.js';

    var reader = new FileReader();
    reader.onload = function(event) {
        var fileArray = new Uint8Array(event.target.result);
        pdfjsLib.getDocument(fileArray).promise.then(parse_pdf);
    };
    reader.readAsArrayBuffer(file);
});

function parse_pdf(pdf) {
    var totalPageCount = pdf.numPages;
    var promises = [];
    for (var currentPage = 1; currentPage <= totalPageCount; currentPage++) {
        var page = pdf.getPage(currentPage);
        promises.push(
            page.then(parse_page),
        );
    }

    return Promise.all(promises).then(function (texts) {
        return console.log(texts.join(''));
    });
}
function parse_page(page) {
    return page.getTextContent()
    .then(function(textContent) {
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
    .then(function(courses) {
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
    .then(function(groupedItems) {
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
    .then(function(filteredItems) {
        // create objects
        const objects = [];
        for (let item of filteredItems) {
            objects.push({
                name: item[0].str,
                scope: item[1].str,
                grade: item[3].str,
                date: item[4].str,
                note: item[5].str,
            });
        }
        console.log("coureses found:", objects);
        return objects;
    })
    .then(display_courses)
    .then(parse_courses)
    .catch(function(error) {
        console.error('Error while parsing page:', error);
    });
}


function display_courses(courses) {
    const coursesContainer = document.getElementById('courses-container');

    coursesContainer.innerHTML = '';

    const table = document.createElement('table');
    table.classList.add('course-table');

    // Create table headers
    const headers = ['Course name', 'Scope', 'Grade', 'Date'];
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

        const nameCell = document.createElement('td');
        nameCell.textContent = course.name;
        row.appendChild(nameCell);
        nameCell.classList.add('table-name'); // Align scope right

        const scopeCell = document.createElement('td');
        scopeCell.textContent = course.scope;
        scopeCell.classList.add('table-scope'); // Align scope right
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


function parse_courses(courses) {
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

            continue;
        }
        total_credits += credits;

        if (course.grade in grade_dict) {
            var gpa = grade_dict[course.grade];
            counted_credits += credits;
            total_gpa += gpa * credits;
        } else {
            console.log("Unknown grade:", course);
        }
    }
    average_gpa = total_gpa / counted_credits;

    console.log("total credits:", total_credits);
    console.log("counted credits:", counted_credits);
    console.log("gpa:", average_gpa);

    const totalCreditsElement = document.getElementById('total-credits');
    totalCreditsElement.textContent = `Total HP: ${total_credits}`;

    const countedCreditsElement = document.getElementById('counted-credits');
    countedCreditsElement.textContent = `Graded HP: ${counted_credits}`;

    const gpaElement = document.getElementById('gpa');
    gpaElement.textContent = `GPA: ${average_gpa.toFixed(2)}`;
}
