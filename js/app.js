var mainData,
    filters = [],
    personnelData,
    headerMapping = [{propName: 'group', displayName: 'band name'}, {propName: 'title', displayName: 'album title'}, 
                        {propName: 'no_of_discs', displayName: 'number of discs'}, {propName: 'release_date', displayName: 'release date'}, 
                        {propName: 'recording_date', displayName: 'recording date'}, {propName: 'personnel' , displayName: 'personnel'}];


(function() {
    var dataRequest = new XMLHttpRequest(),
        albumRequest = new XMLHttpRequest(),
        personnelRequest = new XMLHttpRequest(); 

    dataRequest.onreadystatechange=function() {
        if (dataRequest.readyState===4 && dataRequest.status===200) {
            mainData = parseCSV(dataRequest.responseText);

            albumRequest.onreadystatechange=function() {
                if (albumRequest.readyState===4 && albumRequest.status===200) {
                    var albumData = mergeDuplicateAlbums(parseCSV(albumRequest.responseText));

                    personnelRequest.onreadystatechange=function() {
                        if (personnelRequest.readyState===4 && personnelRequest.status===200) {
                            personnelData = createAlbumPersonnelMapping(parseCSV(personnelRequest.responseText), albumData);
                            createBandTable();
                        }
                    }

                    personnelRequest.open("GET","data/personnel.csv",true); 
                    personnelRequest.send();
                }
            }

            albumRequest.open("GET","data/albums_personnel.csv",true); 
            albumRequest.send();
        }
    }

    dataRequest.open("GET","data/albums.csv",true); 
    dataRequest.send();
})();

function toggleColumnVisible(checkBox) {
    var cells = document.getElementsByName('t' + checkBox.name.replace('check', '')),
        displayMode = checkBox.checked ? 'table-cell' : 'none';

    for (var i = 0; i < cells.length; i++) {
        cells[i].style.display = displayMode;
    }
}

function addFilter(event) {
    if (!event || event.keyCode === 13) {
        var filterProp = document.getElementById("filterProp"),
            filterVal = document.getElementById("filterValue"),
            filterList = document.getElementById("filterList"),
            filteredResultsFound = document.getElementById("filteredResultsFound"),
            resultCount,
            html = '';

        if (filterVal.value.length > 0) {
            filters.push({prop: filterProp.value, val: filterVal.value});
            filterVal.value = '';
            html += '<ul>';

            for (var i = 0; i < filters.length; i++) {
                html += '<li>' + filters[i].prop + '=' + filters[i].val + '</li>';
            }

            html += '</ul><input type="button" value="Clear All Filters" onclick="clearFilters()"/>';
            filterList.innerHTML = html;
            resultCount = createBandTable();
            filteredResultsFound.innerHTML = resultCount + ' of ' + mainData.length + ' albums matched your search';
        }
    }
}

function clearFilters() {
    var filterList = document.getElementById("filterList"),
        filteredResultsFound = document.getElementById("filteredResultsFound");
    filters = [];
    filterList.innerHTML = '';
    filteredResultsFound.innerHTML = '';
    createBandTable();
}

function checkRecordPassesFilters(index) {
    var dataVal,
        filterVal;

    for (var i = 0; i < filters.length; i++) {
        if (filters[i].prop === 'personnel') {
            dataVal = personnelData[index + 1].toLowerCase();            
        }
        else {
            dataVal = mainData[index][filters[i].prop].toLowerCase();
        }

        if (!(dataVal.indexOf(filters[i].val.toLowerCase()) >= 0)) {
            return false;
        }
    }

    return true;
}

function createBandTable() {
    var bandTable = document.getElementById('bandTable'),
        tableHTML = '<table class="sortable draggable" id="bandGrid"><tr>',
        recordsDisplayed = 0;

    for (var i = 0; i < headerMapping.length - 1; i++) {
        tableHTML += '<th name="t' + headerMapping[i].propName + '">' + headerMapping[i].displayName + '</th>';
    }

    tableHTML += '<th class="sorttable_nosort" name="t' + headerMapping[headerMapping.length - 1].propName + '">' + headerMapping[headerMapping.length - 1].displayName + '</th>';

    tableHTML += '</tr>';

    for (i = 0; i < mainData.length; i++) {
        if (checkRecordPassesFilters(i)) {
            recordsDisplayed++;
            tableHTML += '<tr>'
        
            for (var j = 0; j < headerMapping.length - 1; j++) {
                tableHTML += '<td name="t' + headerMapping[j].propName + '"';

                if (headerMapping[j].propName === 'release_date' || headerMapping[j].propName === 'recording_date') {
                    var sortableDateStr = makeSortableDateStr(mainData[i][headerMapping[j].propName]);
                    tableHTML += ' sorttable_customkey="' + sortableDateStr + '"';
                }

                tableHTML += '>';

                if (headerMapping[j].propName === 'title') {
                    tableHTML += '<a href="' + mainData[i]['wiki_link'] + '" target="_blank">' + mainData[i][headerMapping[j].propName] +'</a></td>'
                }
                else {
                    tableHTML += mainData[i][headerMapping[j].propName] + '</td>';
                }
            }

            tableHTML+= '<td name="t' + headerMapping[headerMapping.length - 1].propName + '">' + personnelData[mainData[i].id] + '</td>';

            tableHTML += '</tr>'
        }
    }
    
    tableHTML += '</table>';
    bandTable.innerHTML = tableHTML;

    var bandGrid = document.getElementById("bandGrid");
    sorttable.makeSortable(bandGrid);
    dragtable.makeDraggable(bandGrid);
    return recordsDisplayed;
}

function makeSortableDateStr(date) {
    if (date === null || date === undefined || date.length === 0 || date === '—') {
        return 0;
    }
    else {
        date = date.match(/(\d{1,2})\/(\d{1,2})\/(\d+)/);
        date.splice(0, 1);
    
        if (date[2].length === 2) {
            var firstDigit = date[2].substr(0, 1);

            if (firstDigit === '0' || firstDigit === '1') {
                date[2] = '20' + date[2];
            }
            else {
                date[2] = '19' + date[2];
            }
        }

        for (var i = 0; i < 2; i++) {
            if (date[i].length === 1) {
                date[i] = '0' + date[i];
            }
        }

        return date[2] + date[0] + date[1];
    }
}

function parseCSV(csv) {
    var data = csv.split(/\r|\n|\r\n/),
        headers = data[0].split(',');
        retData = [];

    for (var i = 1; i < data.length; i++) {
        var recordStr = data[i].replace(/"([^",]*?),([^",]*?)"/g, '$1*$2'),
            record = recordStr.split(',');
            retObj = {};

        for (var j = 0; j < record.length; j++) {
            record[j] = record[j].replace('*', ',');

            if (record[j] === null || record[j] === undefined || record[j].length === 0) {
                record[j] = '—';
            }
        }

        for (j = 0; j < headers.length; j++) {
            retObj[headers[j]] = record[j];
        }
        
        retData.push(retObj);
    }

    return retData;
}

function mergeDuplicateAlbums(albums) {
    var retAlbums = {};

    for (var i = 0; i < albums.length; i++) {
        if (retAlbums[albums[i]['album_id']]) {
            retAlbums[albums[i]['album_id']].push(albums[i]['personnel_id']);
        }
        else {
            retAlbums[albums[i]['album_id']] = [albums[i]['personnel_id']];
        }
    }

    return retAlbums;
}

function createAlbumPersonnelMapping(personnel, albums) {
    var retMap = {};

    for (var prop in albums) {
        var personnelIds = albums[prop];
        if (albums.hasOwnProperty(prop)) {
            retMap[prop] = '';

            for (var i = 0; i < personnelIds.length; i++) {
                var fullName = personnel[personnelIds[i] - 1].given_name + ' ' + personnel[personnelIds[i] - 1].surname;

                if (i === 0) {
                    retMap[prop] += fullName;
                }
                else {
                    retMap[prop] += ', ' + fullName;
                }
            }
        }
    }

    return retMap;
}