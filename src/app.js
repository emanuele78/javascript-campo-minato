window.$ = window.jQuery = require('jquery');
import Handlebars from 'handlebars/dist/cjs/handlebars'

//difficulty level listeners
$('.difficulty').click(function () {
    $('.difficulty').removeClass('active_difficulty');
    $(this).addClass('active_difficulty');
    GAME_MODULE.initializeGame($(this).data('value'));
});

//face listener
$('.header_face').on({
    mousedown: function () {
        $(this).addClass('pressed');
        GAME_MODULE.initializeGame(GAME_MODULE.currentLevel);
    },
    mouseup: function () {
        $(this).removeClass('pressed');
    },
    mouseleave: function () {
        $(this).removeClass('pressed');
    },
});

/**
 * Game module
 */
const GAME_MODULE = {
    gameMap: [],
    timeExpiredAt: 999,
    gameSettings: {
        easy: {
            rows: 10,
            cells_per_row: 10,
            bombsCount: 12
        },
        medium: {
            rows: 15,
            cells_per_row: 15,
            bombsCount: 36
        },
        hard: {
            rows: 20,
            cells_per_row: 20,
            bombsCount: 80
        }
    },
    timerReference: null,
    timeElapsed: 0,
    currentLevel: 'easy',
    initializeGame: function (difficulty) {
        if (this.timerReference !== null) {
            clearInterval(this.timerReference);
            this.timeElapsed = 0;
            $('.seconds_count').text('000');
        }
        $('.header_face').html('<i class="fas fa-smile"></i>');
        this.currentLevel = difficulty;
        this.gameMap = generateNewMap();
        printCells();
        placeBombs();
        calculateNearbyBombs();
        attachCellListener();
        this.timerReference = setInterval(printTime, 1000);
        this.bombsToFind = this.gameSettings[this.currentLevel].bombsCount;
        printBombsCount();
    },
    addFlag: function (cellElement) {
        if (this.bombsToFind > 0) {
            cellElement.html('<i class="fas fa-flag"></i>');
            this.bombsToFind--;
            printBombsCount();
            if (this.bombsToFind === 0) {
                checkWin();
            }
        }
    },
    removeFlag: function (cellElement) {
        cellElement.empty();
        this.bombsToFind++;
        printBombsCount();
    },
    showNearbyBombCount: function (cellElement, nearbyBomb) {
        cellElement.html('<span class="color_' + nearbyBomb + '">' + nearbyBomb + '</span>');
    },
    endGameWithForBomb: function (cellElement) {
        cellElement.html('<i class="fas fa-bomb"></i>');
        clearInterval(this.timerReference);
        $('.header_face').html('<i class="fas fa-frown"></i>');
        let outer = this;
        setTimeout(function () {
            alert('Sei finito sopra una mina!');
            outer.initializeGame(outer.currentLevel);
        }, 100);
    },
    endGameForTimeExpired: function () {
        $('.header_face').html('<i class="fas fa-frown"></i>');
        let outer = this;
        setTimeout(function () {
            alert('Tempo scaduto');
            outer.initializeGame(outer.currentLevel);
        }, 100);
    },
    endGameForWinner: function () {
        let outer = this;
        setTimeout(function () {
            alert('Complimenti! Hai trovato tutte le bombe!');
            outer.initializeGame(outer.currentLevel);
        }, 100);
    }
};

/**
 * Entry point
 */
GAME_MODULE.initializeGame($('.active_difficulty').data('value'));

/**
 * Check if all cell marked with a flag by user contain a bomb
 */
function checkWin() {
    let elements = $('.game_cell_hidden:has(.fa-flag)');
    let userWin = true;
    elements.each(function () {
        let rowIndex = $(this).parent().data('row-index');
        let cellIndex = $(this).data('cell-index');
        if (GAME_MODULE.gameMap[rowIndex][cellIndex] !== -1) {
            userWin = false;
            return;
        }
    });
    if (userWin) {
        GAME_MODULE.endGameForWinner();
    }
}

/**
 * Print elapsed time in seconds
 */
function printTime() {
    $('.seconds_count').text(formatValue(GAME_MODULE.timeElapsed));
    if (GAME_MODULE.timeElapsed === GAME_MODULE.timeExpiredAt) {
        GAME_MODULE.endGameForTimeExpired();
        return;
    }
    GAME_MODULE.timeElapsed++;
}

/**
 * Print bomb found by user
 */
function printBombsCount() {
    $('.bombs_count').text(formatValue(GAME_MODULE.bombsToFind))
}

/**
 * format given value to add 0 if on top if needed
 * @param value
 * @returns {*}
 */
function formatValue(value) {
    let stringValue = null;
    if (value < 10) {
        stringValue = '00' + value;
    } else if (value < 100) {
        stringValue = '0' + value;
    } else {
        stringValue = value;
    }
    return stringValue;
}

/**
 * Generate new empty map
 * @returns {Array}
 */
function generateNewMap() {
    let map = [];
    for (let i = 0; i < GAME_MODULE.gameSettings[GAME_MODULE.currentLevel].rows; i++) {
        let cells = [];
        for (let j = 0; j < GAME_MODULE.gameSettings[GAME_MODULE.currentLevel].cells_per_row; j++) {
            cells.push(0);
        }
        map.push(cells);
    }
    return map;
}

/**
 * Print cell to the container
 */
function printCells() {
    let template = Handlebars.compile($('#grid-template').html());
    $('.game_container').html(template(GAME_MODULE.gameMap));
}

/**
 * Attach listener to game cells
 */
function attachCellListener() {
    let gameCellElement = $('.game_cell');
    gameCellElement.off();
    gameCellElement.contextmenu(function () {
        return false;
    });
    gameCellElement.mousedown(function (e) {
        evaluateMove($(this), e.which === 1);
    });
}

/**
 * Cell event
 * @param clickedCellElement
 * @param leftClick
 */
function evaluateMove(clickedCellElement, leftClick) {
    if (clickedCellElement.is(':empty') && !leftClick) {
        GAME_MODULE.addFlag(clickedCellElement);
        return;
    }
    if (clickedCellElement.find('.fa-flag') && !leftClick && clickedCellElement.hasClass('game_cell_hidden')) {
        GAME_MODULE.removeFlag(clickedCellElement);
        return;
    }
    if (clickedCellElement.is(':empty') && leftClick) {
        clickedCellElement.removeClass('game_cell_hidden');
        evaluateCellContent(clickedCellElement);
    }
}

/**
 * Discover cell content
 * @param clickedCellElement
 */
function evaluateCellContent(clickedCellElement) {
    let rowIndex = clickedCellElement.parent().data('row-index');
    let cellIndex = clickedCellElement.data('cell-index');
    if (GAME_MODULE.gameMap[rowIndex][cellIndex] === -1) {
        //bomb!
        GAME_MODULE.endGameWithForBomb(clickedCellElement);
    } else if (GAME_MODULE.gameMap[rowIndex][cellIndex] > 0) {
        //show nearby bombs count
        GAME_MODULE.showNearbyBombCount(clickedCellElement, GAME_MODULE.gameMap[rowIndex][cellIndex]);
    } else {
        //discover all the nearby cells until flag or nearby bomb count
        discoverFromCell(rowIndex, cellIndex);
    }
}

/**
 * Recursive function to discover empty cell
 * @param rowIndex
 * @param cellIndex
 */
function discoverFromCell(rowIndex, cellIndex) {
    //passed index is already discoverd
    let e = getCellFromCoordinates(rowIndex, cellIndex + 1);
    processElement(e, rowIndex, cellIndex + 1);

    e = getCellFromCoordinates(rowIndex, cellIndex - 1);
    processElement(e, rowIndex, cellIndex - 1);

    e = getCellFromCoordinates(rowIndex + 1, cellIndex);
    processElement(e, rowIndex + 1, cellIndex);

    e = getCellFromCoordinates(rowIndex - 1, cellIndex);
    processElement(e, rowIndex - 1, cellIndex);

    e = getCellFromCoordinates(rowIndex - 1, cellIndex - 1);
    processElement(e, rowIndex - 1, cellIndex - 1);

    e = getCellFromCoordinates(rowIndex - 1, cellIndex + 1);
    processElement(e, rowIndex - 1, cellIndex + 1);

    e = getCellFromCoordinates(rowIndex + 1, cellIndex - 1);
    processElement(e, rowIndex + 1, cellIndex - 1);

    e = getCellFromCoordinates(rowIndex + 1, cellIndex + 1);
    processElement(e, rowIndex + 1, cellIndex + 1);
}

/**
 * Process current cell
 * @param element
 * @param rowIndex
 * @param cellIndex
 */
function processElement(element, rowIndex, cellIndex) {
    if (element !== null && element.hasClass('game_cell_hidden') && element.is(':empty')) {
        let nearbyBombsCount = GAME_MODULE.gameMap[rowIndex][cellIndex];
        if (nearbyBombsCount === 0) {
            element.removeClass('game_cell_hidden');
            //recursion
            discoverFromCell(rowIndex, cellIndex);
        } else if (nearbyBombsCount > 0) {
            element.removeClass('game_cell_hidden');
            GAME_MODULE.showNearbyBombCount(element, nearbyBombsCount);
        }
    }
}

/**
 * Return a jquery cell element from index
 * @param rowIndex
 * @param cellIndex
 * @returns {*}
 */
function getCellFromCoordinates(rowIndex, cellIndex) {
    if (!checkCoordinates(rowIndex, cellIndex)) {
        return null;
    }
    let row = $('.row_wrapper[data-row-index=' + rowIndex + ']');
    return row.children('.game_cell[data-cell-index=' + cellIndex + ']');
}

/**
 * Generate new game map
 */
function placeBombs() {
    let bombPlaceds = 0;
    while (bombPlaceds <= GAME_MODULE.gameSettings[GAME_MODULE.currentLevel].bombsCount) {
        let randomRow = Math.floor(Math.random() * GAME_MODULE.gameSettings[GAME_MODULE.currentLevel].rows);
        let randomCell = Math.floor(Math.random() * GAME_MODULE.gameSettings[GAME_MODULE.currentLevel].cells_per_row);
        if (GAME_MODULE.gameMap[randomRow][randomCell] !== -1) {
            GAME_MODULE.gameMap[randomRow][randomCell] = -1;
            bombPlaceds++;
        }
    }
}

/**
 * Calculate nearby bombs for each cell in a map
 */
function calculateNearbyBombs() {
    for (let row = 0; row < GAME_MODULE.gameSettings[GAME_MODULE.currentLevel].rows; row++) {
        for (let cell = 0; cell < GAME_MODULE.gameSettings[GAME_MODULE.currentLevel].cells_per_row; cell++) {
            if (GAME_MODULE.gameMap[row][cell] === 0) {
                GAME_MODULE.gameMap[row][cell] = nearbyBombsCount(row, cell);
            }
        }
    }
}

/**
 * count the nearby bomb from the given coordinates
 * @param rowIndex
 * @param cellIndex
 * @returns {number}
 */
function nearbyBombsCount(rowIndex, cellIndex) {
    let bombCount = 0;
    bombCount = isThereABomb(rowIndex, cellIndex + 1) ? bombCount + 1 : bombCount;
    bombCount = isThereABomb(rowIndex, cellIndex - 1) ? bombCount + 1 : bombCount;
    bombCount = isThereABomb(rowIndex + 1, cellIndex) ? bombCount + 1 : bombCount;
    bombCount = isThereABomb(rowIndex - 1, cellIndex) ? bombCount + 1 : bombCount;
    bombCount = isThereABomb(rowIndex - 1, cellIndex - 1) ? bombCount + 1 : bombCount;
    bombCount = isThereABomb(rowIndex - 1, cellIndex + 1) ? bombCount + 1 : bombCount;
    bombCount = isThereABomb(rowIndex + 1, cellIndex - 1) ? bombCount + 1 : bombCount;
    bombCount = isThereABomb(rowIndex + 1, cellIndex + 1) ? bombCount + 1 : bombCount;
    return bombCount;
}

/**
 * Check for a bomb in given coordinates
 * @param rowIndex
 * @param cellIndex
 * @returns {boolean}
 */
function isThereABomb(rowIndex, cellIndex) {
    //check for invalid cases
    if (!checkCoordinates(rowIndex, cellIndex)) {
        return false;
    }
    return GAME_MODULE.gameMap[rowIndex][cellIndex] === -1;
}

/**
 * Check if given coordinates are valid
 * @param rowIndex
 * @param cellIndex
 * @returns {boolean}
 */
function checkCoordinates(rowIndex, cellIndex) {
    return !(rowIndex < 0
        || cellIndex < 0
        || cellIndex >= rowIndex > GAME_MODULE.gameSettings[GAME_MODULE.currentLevel].cells_per_row
        || rowIndex >= GAME_MODULE.gameSettings[GAME_MODULE.currentLevel].rows);
}