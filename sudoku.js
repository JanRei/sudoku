/**
 * A simple tool for solving Sudokus.
 *
 * @license GPL-3.0-or-later
 */

/* jshint jquery: true */
/* jshint esversion: 6 */
/* jshint globalstrict: true */

"use strict";

/**
 * Storage of the saved game.
 * @type {array}
 * @global
 */
let sudoku_saved_game = [];

/**
 * Global settings
 * @type {object}
 * @property {boolean} highlight_same_values True, if same values should be highlighted. False otherwise.
 * @property {boolean} mark_wrong_fields True, if wrong fields should be marked. False otherwise.
 * @property {array} possible_values Possible values
 * @property {boolean} show_possible_values True, if possibe values should be displayed for each field. False otherwise.
 * @global
 */
let sudoku_global_settings = {
	highlight_same_values: true,
	mark_wrong_fields: true,
	possible_values: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
	show_possible_values: true
};

$(document).ready(function() {
	// Prepare game
	sudoku_prepare_game();
	
	// Register event handling for keyboard control
	$('body').keydown(function (e) {
		switch (e.keyCode) {
			case 46:
			case 8:
				sudoku_unset_value_active();
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
				sudoku_set_value_active(e.key);
		}
	});
	
	// Register event handling for mouse control
	
	$('.sudoku_button_value').click(function() {
		sudoku_set_value_active($(this).text());
	});
	
	$('#sudoku_button_delete').click(sudoku_unset_value_active);
	
	$('.sudoku_field').click(function() {
		sudoku_activate_field(sudoku_parse_fieldid($(this).attr('id')));
	});
	
	$('#sudoku_button_new_game').click(sudoku_new_game);
	$('#sudoku_button_solve').click(sudoku_solve);
	$('#sudoku_button_save').click(sudoku_save);
	$('#sudoku_button_restore').click(sudoku_prepare_game);
	$('#sudoku_button_settings').click(sudoku_show_settings);
	$('#sudoku_button_back_to_game').click(sudoku_save_settings);
});

/**
 * Set focus to field.
 * @param {number} id The field's id (id is calculated by row * 10 + column).
 */
function sudoku_activate_field(id) {
	if (sudoku_get_fieldobject(id)) {
		$('.sudoku_field').removeClass('sudoku_field_active');
		sudoku_get_fieldobject(id).addClass('sudoku_field_active');
		
		sudoku_highlight_fields();
	}
}

/**
 * Highlight active field and fields in current row and current column.
 * Fields with the same value are highlighted as well.
 */
function sudoku_highlight_fields() {
	let current_id = sudoku_get_fieldid_active();
	let	current_fieldinfo = sudoku_get_fieldinfo(current_id);
	let	current_value = sudoku_get_fieldvalue(current_id);
	
	$('.sudoku_field').removeClass('sudoku_field_highlight');
	
	$('.sudoku_field').each(function() {
		let tmp_id = sudoku_parse_fieldid($(this).attr('id'));
		let tmp_fieldinfo = sudoku_get_fieldinfo(tmp_id);
		
		if (tmp_fieldinfo.row == current_fieldinfo.row || tmp_fieldinfo.column == current_fieldinfo.column) {
			sudoku_get_fieldobject(tmp_id).addClass('sudoku_field_highlight');
		}
		
		if (sudoku_global_settings.highlight_same_values) {
			let tmp_value = sudoku_get_fieldvalue(tmp_id);
			let tmp_possible = sudoku_get_field_possible_values(tmp_id);
			
			if (tmp_value != '' && tmp_value == current_value) {
				$(this).addClass('sudoku_field_same_value_filled');
				$(this).removeClass('sudoku_field_same_value_possible');
			} else if (tmp_value == '') {
				$(this).removeClass('sudoku_field_same_value_filled');
				if (tmp_possible.includes(current_value) && sudoku_global_settings.show_possible_values) {
					$(this).addClass('sudoku_field_same_value_possible');
				} else {
					$(this).removeClass('sudoku_field_same_value_possible');
				}
			} else {
				$(this).removeClass('sudoku_field_same_value_filled');
				$(this).removeClass('sudoku_field_same_value_possible');
			}
		} else {
			$(this).removeClass('sudoku_field_same_value_filled');
			$(this).removeClass('sudoku_field_same_value_possible');
		}
	});
}

/**
 * Mark a field as wrong.
 * @param {number} id The field's id (id is calculated by row * 10 + column).
 */
function sudoku_mark_wrong_field(id) {
	if (sudoku_global_settings.mark_wrong_fields) {
		sudoku_get_fieldobject(id).addClass('sudoku_field_error');
	}
}

/**
 * Fill active field (used for user input).
 * @param {string} new_value Value to be filled.
 */
function sudoku_set_value_active(new_value) {
	let current_id = sudoku_get_fieldid_active();
	let current_value = sudoku_get_fieldvalue(current_id);
	
	// Nothing to do if new value is invalid or old and new value are the same.
	if (sudoku_global_settings.possible_values.includes(new_value) && current_value != new_value) {
		sudoku_set_value(current_id, new_value);
		sudoku_check();
		sudoku_update_buttons();
		sudoku_update_possible_values();
		sudoku_highlight_fields();
	}
}

/**
 * Fill a field (used programmatically).
 * @param {number} id The field's id (id is calculated by row * 10 + column).
 * @param {string} new_value Value to be filled.
 */
function sudoku_set_value(id, new_value) {
	let valueid = sudoku_global_settings.possible_values.indexOf(new_value);
	
	if (valueid > -1) {
		sudoku_get_fieldobject(id).text(new_value);
		sudoku_get_fieldobject(id).attr('data-value', valueid);
	}
}

/**
 * Clear active field (used for user input).
 */
function sudoku_unset_value_active() {
	let current_id = sudoku_get_fieldid_active();
	let current_value = sudoku_get_fieldvalue(current_id);
	
	// Nothing to do if active field is empty.
	if (current_value != '') {
		sudoku_unset_value(current_id);
		sudoku_check();
		sudoku_update_buttons();
		sudoku_update_possible_values();
		sudoku_highlight_fields();
	}
}

/**
 * Clear a field (used programmatically).
 * @param {number} id The field's id (id is calculated by row * 10 + column).
 */
function sudoku_unset_value(id) {
	sudoku_get_fieldobject(id).text('');
	sudoku_get_fieldobject(id).removeAttr('data-value');
}

/**
 * Update representation of buttons below playground.
 */
function sudoku_update_buttons() {
	for (let current_valueid = 0; current_valueid < 9; current_valueid++) {
		let current_value_count = 0;
		let current_hint = '';
		
		/* jshint loopfunc: true */
		$('.sudoku_field').each(function() {
			let tmp_id = sudoku_parse_fieldid($(this).attr('id'));
			let tmp_value = sudoku_get_fieldvalue(tmp_id);
			
			if (tmp_value == sudoku_global_settings.possible_values[current_valueid]) {
				current_value_count++;
			}
		});
		
		current_hint += `Fortschritt: ${current_value_count} von 9`;
		
		current_value_count /= 9;
		current_value_count = Math.round(current_value_count * 100);
		
		if (current_value_count > 100) {
			$('#sudoku_button_value' + current_valueid).css('background', '');
			$('#sudoku_button_value' + current_valueid).addClass('sudoku_button_value_wrong');
			$('#sudoku_button_value' + current_valueid).removeClass('sudoku_button_value_complete');
		} else if (current_value_count == 100) {
			$('#sudoku_button_value' + current_valueid).css('background', '');
			$('#sudoku_button_value' + current_valueid).addClass('sudoku_button_value_complete');
			$('#sudoku_button_value' + current_valueid).removeClass('sudoku_button_value_wrong');
		} else {
			$('#sudoku_button_value' + current_valueid).css('background', `linear-gradient(to right, LightBlue ${current_value_count}%, DodgerBlue ${current_value_count}%)`);
			$('#sudoku_button_value' + current_valueid).removeClass('sudoku_button_value_complete');
			$('#sudoku_button_value' + current_valueid).removeClass('sudoku_button_value_wrong');
		}
		
		$('#sudoku_button_value' + current_valueid).attr('title', current_hint);
	}
}

/**
 * Move focus to a field next to the active one.
 * @param {string} direction Possible values: 'left', 'right', 'up', 'down'.
 */
function sudoku_move_focus(direction) {
	let current_id = sudoku_get_fieldid_active();
	
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
		default:
			// Do nothing
	}
	
	sudoku_activate_field(current_id);
}

/**
 * Solve the Sudoku. Shows a message when finished.
 */
function sudoku_solve() {
	let sudoku_solve_field_has_been_filled = true;
	let sudoku_solve_error = false;
	
	sudoku_check(true);
	while (sudoku_solve_field_has_been_filled && !sudoku_solve_error) {		
		let sudoku_solve_find_unique_possibilities_in_scope = {
			column: [], 
			row: [], 
			square: []
		};
		
		sudoku_solve_field_has_been_filled = false;
		
		/* jshint loopfunc: true */
		$('.sudoku_field').each(function() {
			let current_id = sudoku_parse_fieldid($(this).attr('id'));
			let current_fieldinfo = sudoku_get_fieldinfo(current_id);
			let tmp_possible = sudoku_get_field_possible_values(current_id);
			
			if (tmp_possible.length == 0) {
				alert('Lösen des Sudokus nicht möglich, da es Fehler enthält.');
				sudoku_solve_error = true;
				
				return false;
			}
			
			if (tmp_possible.length == 1 && sudoku_get_fieldvalue(current_id) == '') {
				sudoku_set_value(current_id, tmp_possible[0]);
				sudoku_solve_field_has_been_filled = true;
				console.log(`Sudoku: Filled value '${tmp_possible[0]}' in field ${current_id}, because it's the only possible value for this field`);
			}

			sudoku_solve_find_unique_possibilities_in_scope.column = sudoku_solve_find_unique_possibilities(sudoku_solve_find_unique_possibilities_in_scope.column, tmp_possible, current_id, current_fieldinfo.column);
			sudoku_solve_find_unique_possibilities_in_scope.row = sudoku_solve_find_unique_possibilities(sudoku_solve_find_unique_possibilities_in_scope.row, tmp_possible, current_id, current_fieldinfo.row);
			sudoku_solve_find_unique_possibilities_in_scope.square = sudoku_solve_find_unique_possibilities(sudoku_solve_find_unique_possibilities_in_scope.square, tmp_possible, current_id, current_fieldinfo.square_first_field);
		});
		
		if (!sudoku_solve_error) {
			for (let current_scope in sudoku_solve_find_unique_possibilities_in_scope) {
				if (sudoku_solve_find_unique_possibilities_in_scope.hasOwnProperty(current_scope)) {
					sudoku_solve_find_unique_possibilities_in_scope[current_scope].forEach(function(item) {
						for (let current_valueid = 0; current_valueid < 9; current_valueid++) {
							let tmp_value = sudoku_global_settings.possible_values[current_valueid];
							let tmp_id = item[tmp_value];
							
							if (tmp_id > 0) {
								sudoku_set_value(tmp_id, tmp_value);
								sudoku_solve_field_has_been_filled = true;
								console.log(`Sudoku: Filled value '${tmp_value}' in field ${tmp_id}, because it's the only possible place in this ${current_scope}`);
							}
						}
					});
				}
			}
		}
		
		if (sudoku_solve_field_has_been_filled) {
			sudoku_check();
		}
	}
	
	sudoku_update_buttons();
	sudoku_highlight_fields();
	sudoku_update_possible_values();
	
	if (!sudoku_solve_error) {
		alert('Lösen des Sudokus abgeschlossen.');
	}
}

/**
 * Helper function for {@link sudoku_solve}. We want to find out whether a value has to be placed in current field,
 * because there are no other possible places in current column, row or square.
 * @param {array} current_scope_data Array for current scope (column, row or square) containing fields where a values needs to placed.
 * @param {array} possible_values_in_field Array containing the possible values of the current field.
 * @param {number} current_id Id of the current field.
 * @param {number} current_scope_id Number of current column, current row or first field in current square.
 * @returns {array} Updated array current_scope_data considering possible values in current field.
 */
function sudoku_solve_find_unique_possibilities(current_scope_data, possible_values_in_field, current_id, current_scope_id) {
	for (let current_valueid = 0; current_valueid < 9; current_valueid++) {
		let tmp_value_to_test = sudoku_global_settings.possible_values[current_valueid];
		
		if (!current_scope_data[current_scope_id]) {
			current_scope_data[current_scope_id] = [];
		}
		
		if (possible_values_in_field.includes(tmp_value_to_test)) {
			if (sudoku_get_fieldvalue(current_id) == tmp_value_to_test) {
				// If value we are testing for has been filled in current scope: skip value
				current_scope_data[current_scope_id][tmp_value_to_test] = -1;
			} else if (sudoku_get_fieldvalue(current_id) == '') {
				if (current_scope_data[current_scope_id][tmp_value_to_test] > 0) {
					// We see this possible value the second time, so forget the field id
					current_scope_data[current_scope_id][tmp_value_to_test] = -1;
				} else if (typeof current_scope_data[current_scope_id][tmp_value_to_test] === 'undefined') {
					// We see this possible value for the first time, so remember the field id
					current_scope_data[current_scope_id][tmp_value_to_test] = current_id;
				} else {
					// Nothing to do in other cases
				}
			} else {
				// If field has been filled, but not with the value we are testing for: ignore
			}
		}
	}
	
	return current_scope_data;
}

/**
 * Get all possible values which can be filled in active field.
 * @param {number} [id] The field's id (id is calculated by row * 10 + column). If no id is given, the active field is used.
 * @return {array} An array with all possible values.
 */
function sudoku_get_field_possible_values(id) {
	let possible_values_in_field = [];
	
	if (id) {
		possible_values_in_field = sudoku_get_fieldobject(id).attr('data-possible');
	} else {
		possible_values_in_field = sudoku_get_fieldobject(sudoku_get_fieldid_active()).attr('data-possible');
	}
	
	if (possible_values_in_field) {
		// There are possible values, split them and return them as an array
		return possible_values_in_field.split(',');
	} 
	
	// No possible values
	return [];
}

/**
 * Cycle through all fields and show possible values for empty fields.
 */
function sudoku_update_possible_values() {
	$('.sudoku_field').each(function() {
		let current_id = sudoku_parse_fieldid($(this).attr('id'));
		
		if (sudoku_get_fieldvalue(current_id) == '') {
			if (sudoku_global_settings.show_possible_values) {
				let tmp_table = $('<table>');
				
				tmp_table.addClass('sudoku_field_possible_values');
				
				for (let i = 0; i < 3; i++) {
					let tmp_table_rows = $('<tr>');
					
					for (let k = 0; k < 3; k++) {
						let tmp_value = sudoku_global_settings.possible_values[i * 3 + k];
						let possible_values_in_field = sudoku_get_field_possible_values(current_id);
						let tmp_table_row_cell = $(`<td>${tmp_value}</td>`);
						
						if (!possible_values_in_field.includes(tmp_value)) {
							tmp_table_row_cell.addClass('sudoku_field_possible_values_ruledout');
						}
						
						tmp_table_rows.append(tmp_table_row_cell);
					}
					tmp_table.append(tmp_table_rows);
				}
				
				$(this).empty();
				$(this).append(tmp_table);
			} else {
				$(this).empty();
			}
		}
	});
}

/**
 * Get id of active field.
 * @return {number} The id of the active field.
 */
function sudoku_get_fieldid_active() {
	return sudoku_parse_fieldid($('.sudoku_field_active').attr('id'));
}

/**
 * Parse the HTML id of a field.
 * @param {string} id The HTML id of the field.
 * @return {number} The field's id (id is calculated by row * 10 + column).
 */
function sudoku_parse_fieldid(id) {
	return Number(id.replace('sudoku_field', ''));
}

/**
 * Get info about the position of a field in the playground.
 * @param {number} id The field's id (id is calculated by row * 10 + column).
 * @returns {Object} fieldinfo Info about field.
 * @returns {number} fieldinfo.column The column where the field is located.
 * @returns {number} fieldinfo.row The row where the field is located.
 * @returns {number} fieldinfo.square_column Number representing whether field is located in 1st, 2nd or 3rd square horizontally.
 * @returns {number} fieldinfo.square_row Number representing whether field is located in 1st, 2nd or 3rd square vertically.
 * @returns {number} fieldinfo.square_first_field The first field of the square where the field is located.
 */
function sudoku_get_fieldinfo(id) {
	let current_row = Math.floor(id / 10);
	let current_column = id % 10;
	
	let current_square_row = Math.floor((current_row - 1) / 3) + 1;
	let current_square_column = Math.floor((current_column - 1) / 3) + 1;
	let current_square_first_field = ((current_square_row - 1) * 3 + 1) * 10 + (current_square_column - 1) * 3 + 1;
	
	return {
		column: current_column,
		row: current_row,
		square_column: current_square_column,
		square_first_field: current_square_first_field,
		square_row: current_square_row
	};
}

/**
 * Get object representation of a field.
 * @param {number} id The field's id (id is calculated by row * 10 + column).
 * @return {jQuery} jQuery object.
 */
function sudoku_get_fieldobject(id) {
	let fieldobject = $('#sudoku_field' + id);
	
	if (fieldobject.length == 1) {
		return fieldobject;
	} else {
		return null;
	}
}

/**
 * Get the value of a field.
 * @param {number} id The field's id (id is calculated by row * 10 + column).
 * @return {string} Value of given field. Empty string, if field is empty.
 */
function sudoku_get_fieldvalue(id) {
	let tmp_value = sudoku_get_fieldobject(id).attr('data-value');
	
	if (typeof tmp_value === 'undefined') {
		return '';
	}
	
	return sudoku_global_settings.possible_values[tmp_value];
}

/**
 * Check the complete Sudoku, mark wrong fields and calculate possible values.
 * @param {boolean} [clear_wrong_fields=false] If true, wrong fields are cleared. If false, they are marked.
 */
function sudoku_check(clear_wrong_fields = false) {
	let wrong_field_detected = false;
	
	// Prepare check by clearing all errors etc.
	$('.sudoku_field').each(function() {
		$(this).attr('data-possible', sudoku_global_settings.possible_values);
		$(this).removeClass('sudoku_field_error');
	});
	
	// Cycle through all fields.
	$('.sudoku_field').each(function() {
		let current_id = sudoku_parse_fieldid($(this).attr('id'));
		let current_fieldinfo = sudoku_get_fieldinfo(current_id);
		let current_value = sudoku_get_fieldvalue(current_id);
		let tmp_id = 0;
		let tmp_result = false;
		
		// Make sure value are only filled once in their row and only once in their column.
		for (let i = 1; i < 10; i++) {
			tmp_id = current_fieldinfo.row * 10 + i;
			tmp_result = sudoku_check_single(current_id, current_value, tmp_id, clear_wrong_fields);
			wrong_field_detected = wrong_field_detected || tmp_result;
			
			tmp_id = i * 10 + current_fieldinfo.column;
			tmp_result = sudoku_check_single(current_id, current_value, tmp_id, clear_wrong_fields);
			wrong_field_detected = wrong_field_detected || tmp_result;
		}
		
		// Make sure value are only filled once in their square.
		for (let m = 0; m < 3; m++) {
			for (let n = 0; n < 3; n++) {
				tmp_id = current_fieldinfo.square_first_field + m * 10 + n;
				tmp_result = sudoku_check_single(current_id, current_value, tmp_id, clear_wrong_fields);
				wrong_field_detected = wrong_field_detected || tmp_result;
			}
		}
	});
	
	// We cleared wrong fields, so we need to run again.
	if (wrong_field_detected && clear_wrong_fields) {
		sudoku_check();
	}
}

/**
 * Check a single field of the Sudoku. Helper function for @link sudoku_check.
 * @param {number} current_id The id of the current field.
 * @param {number} current_value The value filled in the current field.
 * @param {number} target_id The id of the field we need to compare with.
 * @param {boolean} clear_wrong_fields If true, wrong fields are cleared. If false, they are marked.
 * @return {boolean} True, if wrong fields have been detected. False otherwise.
 */
function sudoku_check_single(current_id, current_value, target_id, clear_wrong_fields) {
	let wrong_field_detected = false;
	
	// Skip, if current field is empty. Or if current and target field is the same.
	if (current_value == '' || target_id == current_id) {
		return false;
	}
	
	// Remove value in target field from list of possible values for current field.
	let tmp_value = sudoku_get_fieldvalue(target_id);
	let tmp_possible = sudoku_get_field_possible_values(target_id);
	let tmp_possible_id = tmp_possible.indexOf(current_value);
	
	if (tmp_possible_id > -1) {
		tmp_possible.splice(tmp_possible_id, 1);
	}
	
	if (tmp_possible.length == 0) {
		// No values possible in field.
		// Mark as error, but do not report as an error in this field since mistake could be in other field.
		sudoku_mark_wrong_field(target_id);
	}
	
	// Value has been found twice in scope (row, column or square). So fields have been filled wrong.
	if (tmp_value == current_value) {
		if (clear_wrong_fields) {
			sudoku_unset_value(target_id);
			sudoku_unset_value(current_id);
		} else {
			sudoku_mark_wrong_field(target_id);
			sudoku_mark_wrong_field(current_id);
		}
		wrong_field_detected = true;
	}
	
	// Store possible values
	sudoku_get_fieldobject(target_id).attr('data-possible', tmp_possible.sort());
	
	return wrong_field_detected;
}

/**
 * Prepare game by clearing all fields or restoring a saved game. Focus is set to first field (id 11).
 */
function sudoku_prepare_game() {
	// Try to load saved game
	if (sudoku_load()) {
		sudoku_restore();
		$('#sudoku_button_restore').removeAttr('disabled');
	} else {
		sudoku_clear();
		$('#sudoku_button_restore').attr('disabled', true);
	}
	
	// Show and update possible values
	sudoku_change_possible_values();
	sudoku_update_possible_values();
	
	// Activate first field
	sudoku_activate_field(11);
}

/**
 * Hide playground, controls and buttons. Show settings.
 */
function sudoku_show_settings() {
	$('#sudoku_table_group_playground').hide();
	$('#sudoku_table_group_controls').hide();
	$('#sudoku_table_group_values').hide();
	$('.sudoku_table_group_separator').hide();
	$('#sudoku_table_group_settings').show();
	$('#sudoku_settings_possible_values').val(sudoku_global_settings.possible_values.join(''));
	
	if (sudoku_global_settings.mark_wrong_fields) {
		$('#sudoku_settings_mark_wrong_fields_yes').prop('checked', true);
		$('#sudoku_settings_mark_wrong_fields_no').prop('checked', false);
	} else {
		$('#sudoku_settings_mark_wrong_fields_yes').prop('checked', false);
		$('#sudoku_settings_mark_wrong_fields_no').prop('checked', true);
	}
	
	if (sudoku_global_settings.show_possible_values) {
		$('#sudoku_settings_show_possible_values_yes').prop('checked', true);
		$('#sudoku_settings_show_possible_values_no').prop('checked', false);
	} else {
		$('#sudoku_settings_show_possible_values_yes').prop('checked', false);
		$('#sudoku_settings_show_possible_values_no').prop('checked', true);
	}
	
	if (sudoku_global_settings.highlight_same_values) {
		$('#sudoku_settings_highlight_same_values_yes').prop('checked', true);
		$('#sudoku_settings_highlight_same_values_no').prop('checked', false);
	} else {
		$('#sudoku_settings_highlight_same_values_yes').prop('checked', false);
		$('#sudoku_settings_highlight_same_values_no').prop('checked', true);
	}
}

/**
 * Show playground, controls and buttons. Hide and save settings.
 */
function sudoku_save_settings() {
	// Check definition of possible values
	let tmp_settings_new_possible_values = Array.from($('#sudoku_settings_possible_values').val());
	
	tmp_settings_new_possible_values = Array.from(new Set(tmp_settings_new_possible_values));
	
	if (tmp_settings_new_possible_values.length != 9 || tmp_settings_new_possible_values.includes('')) {
		alert('Einstellungen ungültig: Es müssen neun verschiedene mögliche Werte definiert werden!');
		
		return;
	}
	
	// Save new settings
	sudoku_global_settings.possible_values = tmp_settings_new_possible_values;
	sudoku_global_settings.show_possible_values = $('#sudoku_settings_show_possible_values_yes').prop('checked');
	sudoku_global_settings.mark_wrong_fields = $('#sudoku_settings_mark_wrong_fields_yes').prop('checked');
	sudoku_global_settings.highlight_same_values = $('#sudoku_settings_highlight_same_values_yes').prop('checked');
	
	// Back to game
	$('#sudoku_table_group_playground').show();
	$('#sudoku_table_group_controls').show();
	$('#sudoku_table_group_values').show();
	$('.sudoku_table_group_separator').show();
	$('#sudoku_table_group_settings').hide();
	
	// Apply new settings
	sudoku_change_possible_values();
	sudoku_check();
	sudoku_update_possible_values();
	sudoku_highlight_fields();
}

/**
 * Possible values have been changed. We need to update buttons and values in fields accordingly.
 */
function sudoku_change_possible_values() {
	// Put possible values in description of buttons below the playground
	$('.sudoku_button_value').each(function(index) {
		$(this).text(sudoku_global_settings.possible_values[index]);
	});
	$('.sudoku_field').each(function() {
		$(this).text(sudoku_global_settings.possible_values[$(this).attr('data-value')]);
	});
}

/**
 * Start a new game (by calling {@link sudoku_clear} and {@link sudoku_prepare_game}).
 */
function sudoku_new_game() {
	sudoku_clear();
	sudoku_prepare_game();
}

/**
 * Clear field and delete saved game.
 */
function sudoku_clear() {
	$('.sudoku_field').each(function() {
		let tmp_id = sudoku_parse_fieldid($(this).attr('id'));
		
		sudoku_unset_value(tmp_id);
		$(this).attr('data-possible', sudoku_global_settings.possible_values);
		$(this).removeClass('sudoku_field_error');
		$(this).removeClass('sudoku_field_same_value_filled');
		$(this).removeClass('sudoku_field_same_value_possible');
	});
	
	try {
		localStorage.removeItem('sudoku_saved_game');
		localStorage.removeItem('sudoku_possible_values');
	} catch (e) {
		// Local storage is not available
	}
}

/**
 * Save current game to local storage. This allows returning to this state.
 * @see {@link sudoku_restore}
 * @see {@link sudoku_load}
 */
function sudoku_save() {
	sudoku_saved_game = [];
	
	for (let current_row = 1; current_row < 10; current_row++) {
		for (let current_column = 1; current_column < 10; current_column++) {
			let tmp_id = current_row * 10 + current_column;
			let tmp_value = sudoku_get_fieldvalue(tmp_id);
			
			sudoku_saved_game[tmp_id] = tmp_value;
		}
	}
	
	try {
		localStorage.setItem('sudoku_saved_game', JSON.stringify(sudoku_saved_game));
		localStorage.setItem('sudoku_possible_values', JSON.stringify(sudoku_global_settings.possible_values));
		$('#sudoku_button_restore').removeAttr('disabled');
	} catch (e) {
		// Local storage is not available
		alert('Der Spielstand konnte nicht gespeichert werden.');
	}
}

/**
 * Return to saved state.
 * @see {@link sudoku_save}
 * @see {@link sudoku_load}
 */
function sudoku_restore() {
	for (let current_row = 1; current_row < 10; current_row++) {
		for (let current_column = 1; current_column < 10; current_column++) {
			let tmp_id = current_row * 10 + current_column;
			let tmp_value = sudoku_saved_game[tmp_id];
			
			if (tmp_value) {
				sudoku_set_value(tmp_id, sudoku_saved_game[tmp_id]);
			} else {
				sudoku_unset_value(tmp_id);
			}
		}
	}
	
	sudoku_check();
}

/**
 * Load a saved game from local storage.
 * @return {boolean} True, if a game could be loaded. False, otherwise.
 * @see {@link sudoku_save}
 * @see {@link sudoku_load}
 */
function sudoku_load() {
	let sudoku_loaded_game = null;
	let sudoku_loaded_values = null;
	
	try {
		sudoku_loaded_game = localStorage.getItem('sudoku_saved_game');
		sudoku_loaded_values = localStorage.getItem('sudoku_possible_values');
	} catch (e) {
		// Local storage is not available
		alert('Der Spielstand konnte nicht geladen werden.');
	}
	
	if (sudoku_loaded_game) {
		sudoku_saved_game = JSON.parse(sudoku_loaded_game);
		sudoku_global_settings.possible_values = JSON.parse(sudoku_loaded_values);
		
		return true;
	}
	
	return false;
}