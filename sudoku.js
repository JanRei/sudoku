/**
* A simple tool for solving Sudokus.
*
* @license GPL-3.0-or-later
*/

$(document).ready(function() {
	// Prepare game
	
	sudoku_prepare_game();
	
	// Register event handling for keyboard control
	
	$('body').keydown(function (e) {
		switch (e.keyCode) {
			case 49:
			case 97:
				sudoku_set_number(1);
				break;
			case 50:
			case 98:
				sudoku_set_number(2);
				break;
			case 51:
			case 99:
				sudoku_set_number(3);
				break;
			case 52:
			case 100:
				sudoku_set_number(4);
				break;
			case 53:
			case 101:
				sudoku_set_number(5);
				break;
			case 54:
			case 102:
				sudoku_set_number(6);
				break;
			case 55:
			case 103:
				sudoku_set_number(7);
				break;
			case 56:
			case 104:
				sudoku_set_number(8);
				break;
			case 57:
			case 105:
				sudoku_set_number(9);
				break;
			case 46:
			case 8:
				sudoku_unset_number();
				break;
			case 39:
				sudoku_move_focus('right');
				break;
			case 37:
				sudoku_move_focus('left');
				break;
			case 38:
				sudoku_move_focus('up');
				break;
			case 40:
				sudoku_move_focus('down');
				break;
			default:
				// Nothing to do
		}
	});
	
	// Register event handling for mouse control
	
	$('.sudoku_button_number').click(function() {
		sudoku_set_number($(this).text());
	});
	
	$('#sudoku_button_delete').click(function() {
		sudoku_unset_number();
	});
	
	$('.sudoku_field').click(function() {
		sudoku_activate_field(sudoku_parse_fieldid($(this).attr('id')));
	});
	
	$('#sudoku_button_clear').click(sudoku_prepare_game);
	$('#sudoku_button_solve').click(sudoku_solve);
});

/** Set focus to field.
* @param {number} id The field's id (id is calculated by row * 10 + column).
*/
function sudoku_activate_field(id) {
	if (sudoku_get_field(id).length) {
		$('.sudoku_field').removeClass('sudoku_field_active');
		sudoku_get_field(id).addClass('sudoku_field_active');
		
		sudoku_mark_fields();
		sudoku_update_buttons();
	}
}

/** Highlight active field plus fields with the same number.
*/
function sudoku_mark_fields() {
	$('.sudoku_field').removeClass('sudoku_field_highlight');
	
	var current_id = sudoku_get_fieldid_active();
	var current_row = Math.floor(current_id / 10);
	var current_column = current_id % 10;
	var current_number = parseInt($(this).text()) || 0;
	
	for (i = 1; i < 10; i++) {
		tmp_id = current_row * 10 + i;
		sudoku_get_field(tmp_id).addClass('sudoku_field_highlight');
		
		tmp_id = i * 10 + current_column;
		sudoku_get_field(tmp_id).addClass('sudoku_field_highlight');
	}
	
	$('.sudoku_field').each(function() {
		if ($(this).text() != '' && $(this).text() == $('.sudoku_field_active').text()) {
			$(this).addClass('sudoku_field_same_number');
		} else {
			$(this).removeClass('sudoku_field_same_number');
		}
	});
}

/** Fill active field.
* @param {number} new_number Number to be filled (1..9).
*/ 
function sudoku_set_number(new_number) {
	var current_number = parseInt($('.sudoku_field_active').text()) || 0;
	
	// Nothing to do if old and new number are the same.
	if (current_number != new_number) {
		$('.sudoku_field_active').text(new_number);
		sudoku_update_number_count(current_number, -1);
		sudoku_update_number_count(new_number, 1);
		sudoku_update_buttons();
		sudoku_mark_fields();
		sudoku_check();
	}
}

/** Clear active field.
*/
function sudoku_unset_number() {
	var current_number = parseInt($('.sudoku_field_active').text()) || 0;
	
	// Nothing to do if active field is empty.
	if (current_number != 0) {
		$('.sudoku_field_active').text('');
		sudoku_update_number_count(current_number, -1);
		sudoku_update_buttons();
		sudoku_mark_fields();
		sudoku_check();
	}
}

/** Update count how ofter number has been filled already.
* @param {number} number The number (1..9).
* @param {change} change The change, new value will be old value + change.
*/
function sudoku_update_number_count(number, change) {
	var number_count = parseInt($('#sudoku_button_number'+number).attr('data-count')) || 0;
	$('#sudoku_button_number'+number).attr('data-count', number_count + change);
}

/** Update representation of buttons below playground.
*/
function sudoku_update_buttons() {
	var possible_numbers = sudoku_get_possible_numbers();
	
	for (current_number = 1; current_number < 10; current_number++) {
		var current_number_count = parseInt($('#sudoku_button_number'+current_number).attr('data-count')) || 0;
		var current_number_progess = current_number_count / 9;
		
		current_number_progess = Math.round(current_number_progess*100);
		
		if (current_number_progess > 100) {
			$('#sudoku_button_number'+current_number).css('background', 'Red');
		} else if (current_number_progess == 100) {
			$('#sudoku_button_number'+current_number).css('background', 'LightBlue');
		} else {
			$('#sudoku_button_number'+current_number).css('background', 'linear-gradient(to right, LightBlue '+current_number_progess+'%, DodgerBlue '+current_number_progess+'%)');
		}
		
		if (!possible_numbers.includes(current_number)) {
			$('#sudoku_button_number'+current_number).addClass('sudoku_button_number_not_possible');
		} else {
			$('#sudoku_button_number'+current_number).removeClass('sudoku_button_number_not_possible');
		}
	}
}

/** Move focus to a field next to the active one.
* @param {string} direction Possible values: 'left', 'right', 'up', 'down'.
*/
function sudoku_move_focus(direction) {
	var current_id = sudoku_get_fieldid_active();

	switch (direction) {
		case 'left':
			current_id -= 1;
			break;
		case 'right':
			current_id += 1;
			break;
		case 'up':
			current_id -= 10;
			break;
		case 'down':
			current_id += 10;
			break;
	}
	
	sudoku_activate_field(current_id);
}

/** Solve the Sudoku.
*/
function sudoku_solve() {
	var field_has_been_filled = true;
	
	sudoku_check(true);
	while (field_has_been_filled) {
		field_has_been_filled = false;
		
		$('.sudoku_field').each(function() {
			var current_id = sudoku_parse_fieldid($(this).attr('id'));
			var tmp_possible = sudoku_get_possible_numbers(current_id);
			
			if (tmp_possible.length == 1 && $(this).text() == '') {
				$(this).text(tmp_possible[0]);
				sudoku_update_number_count(tmp_possible[0], 1);
				field_has_been_filled = true;
			}
		});
		
		if (field_has_been_filled) sudoku_check();
	}
}

/** Get all possible numbers which can be filled in active field.
* @param {number} [id] The field's id (id is calculated by row * 10 + column). If no id is given, the active field is used.
* @return {Array} An array with all possible numbers.
*/
function sudoku_get_possible_numbers(id) {
	var possible_numbers = [];

	if (id) {
		possible_numbers = sudoku_get_field(id).attr('data-possible').split(',');
	} else {
		possible_numbers = $('.sudoku_field_active').attr('data-possible').split(',');
	}
	
	return possible_numbers.map(Number);
}

/** Get id of active field.
* @return {number} The id of the active field.
**/
function sudoku_get_fieldid_active() {
	return sudoku_parse_fieldid($('.sudoku_field_active').attr('id'));
}

/** Parse the HTML id of a field.
* @param {number} id The HTML id of the field.
* @return {number} id The field's id (id is calculated by row * 10 + column).
*/
function sudoku_parse_fieldid(id) {
	return Number(id.replace('sudoku_field', ''));
}

/** Get object representation of a field.
* @param {number} id The field's id (id is calculated by row * 10 + column).
* @return {jQuery} jQuery object.
*/
function sudoku_get_field(id) {
	return $('#sudoku_field' + id);
}

/** Check the complete Sudoku, mark wrong fields and calculate possible numbers.
* @param {boolean} [clear_wrong_fields=false] If true, wrong fields are cleared. If false, they are marked.
*/
function sudoku_check(clear_wrong_fields = false) {
	// Prepare check by clearing all errors etc.
	$('.sudoku_field').each(function() {
		var tmp = [1,2,3,4,5,6,7,8,9];
		$(this).attr('data-possible', tmp);
		$(this).removeClass('sudoku_field_error');
	});
	
	// Cycle through all fields.
	var wrong_field_detected = false;
	$('.sudoku_field').each(function() {
		var current_id = sudoku_parse_fieldid($(this).attr('id'));
		var current_row = Math.floor(current_id / 10);
		var current_column = current_id % 10;
		var current_number = parseInt($(this).text()) || 0;
		var tmp_id = 0;
		var tmp_result = false;
		
		// Make sure numbers are only filled once in their row and only once in their column.
		for (i = 1; i < 10; i++) {
			tmp_id = current_row * 10 + i;
			tmp_result = sudoku_check_single(current_id, current_number, tmp_id, clear_wrong_fields);
			wrong_field_detected = wrong_field_detected || tmp_result;
			
			tmp_id = i * 10 + current_column;
			tmp_result = sudoku_check_single(current_id, current_number, tmp_id, clear_wrong_fields);
			wrong_field_detected = wrong_field_detected || tmp_result;
		}
		
		// Make sure numbers are only filled once in their square.
		
		var square_row = current_row;
		var square_column = current_column;
		
		if (square_row % 3 == 2) square_row -= 1
		if (square_row % 3 == 0) square_row -= 2
		if (square_column % 3 == 2) square_column -= 1
		if (square_column % 3 == 0) square_column -= 2
		
		for (i = 0; i < 3; i++) {
			for (j = 0; j < 3; j++) {
				tmp_id = (square_row + i) * 10 + (square_column + j);
				tmp_result = sudoku_check_single(current_id, current_number, tmp_id, clear_wrong_fields);
				wrong_field_detected = wrong_field_detected || tmp_result;
			}
		}
	});
	
	// We cleared wrong fields, so update marked fields and buttons. Then run again.
	if (wrong_field_detected && clear_wrong_fields) {
		sudoku_mark_fields();
		sudoku_check(); 
		sudoku_update_buttons();
	}
}

/** Check a single field of the Sudoku. Helper function for @link sudoku_check.
* @param {number} current_id The id of the current field.
* @param {number} current_number The number filled in the current field.
* @param {number} target_id The id of the field we need to compare with.
* @param {boolean} clear_wrong_fields If true, wrong fields are cleared. If false, they are marked.
* @return {boolean} True, if wrong fields have been detected. False otherwise.
*/
function sudoku_check_single(current_id, current_number, target_id, clear_wrong_fields) {
	var wrong_field_detected = false;
	
	// Skip, if current field is empty. Or if current and target field is the same.
	if (current_number == 0 || target_id == current_id) return wrong_field_detected;
	
	// Remove number in target field from list of possible numbers for current field.
	var tmp_number = parseInt(sudoku_get_field(target_id).text()) || 0;
	var tmp_possible = sudoku_get_possible_numbers(target_id);
	
	var tmp_possible_id = tmp_possible.indexOf(current_number);
	if (tmp_possible_id > -1) {
		tmp_possible.splice(tmp_possible_id, 1);
	}
	
	// Number has been found twice in scope (row, column or square). So fields have been filled wrong.
	if (tmp_number == current_number) {
		if (clear_wrong_fields) {
			sudoku_get_field(target_id).text('');
			sudoku_get_field(current_id).text('');
			sudoku_update_number_count(current_number, -2); // Number got deleted twice
		} else {
			sudoku_get_field(target_id).addClass('sudoku_field_error');
			sudoku_get_field(current_id).addClass('sudoku_field_error');
		}
		wrong_field_detected = true;
	}
	
	// Store possible numbers
	sudoku_get_field(target_id).attr('data-possible', tmp_possible.sort());
	
	return wrong_field_detected;
}

/** Prepare game by clearing all fields and setting focus to first field (id 11).
*/
function sudoku_prepare_game() {
	$('.sudoku_field').each(function() {
		var tmp = [1,2,3,4,5,6,7,8,9];
		$(this).text('');
		$(this).attr('data-possible', tmp);
		$(this).removeClass('sudoku_field_error');
		$(this).removeClass('sudoku_field_active');
		$(this).removeClass('sudoku_field_highlight');
		$(this).removeClass('sudoku_field_same_number');
	});
	$('.sudoku_button_number').each(function() {
		$(this).attr('data-count', 0);
	});
	sudoku_activate_field(11);
	sudoku_update_buttons();
}