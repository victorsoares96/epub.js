import EventEmitter from "event-emitter";
import EpubCFI from "./epubcfi";
import { EVENTS } from "./utils/constants";

/**
	* Handles managing adding & removing Annotations
	* @param {Rendition} rendition
	* @class
	*/
class Annotations {

	constructor (rendition) {
		this.rendition = rendition;
		this.highlights = [];
		this.underlines = [];
		this.marks = [];
		this._annotations = {};
		this._annotationsBySectionIndex = {};

		this.rendition.hooks.render.register(this.inject.bind(this));
		this.rendition.hooks.unloaded.register(this.clear.bind(this));
	}

	/**
	 * Add an annotation to store
	 * @param {string} type Type of annotation to add: "highlight", "underline", "mark"
	 * @param {EpubCFI} cfiRange EpubCFI range to attach annotation to
	 * @param {object} data Data to assign to annotation
	 * @param {function} [cb] Callback after annotation is added
	 * @param {string} className CSS class to assign to annotation
	 * @param {object} styles CSS styles to assign to annotation
	 * @param {EpubCFI} cfiRangeText EpubCFI range to attach annotation to
	 * @returns {Annotation} annotation
	 */
	add (type, cfiRange, data, cb, className, styles, cfiRangeText) {
		let hash = encodeURI(cfiRange + type);
		let cfi = new EpubCFI(cfiRange);
		let sectionIndex = cfi.spinePos;
		let annotation = new Annotation({
			type,
			cfiRange,
			data,
			sectionIndex,
			cb,
			className,
			styles,
			cfiRangeText,
		});

		this._annotations[hash] = annotation;

		if (type === "highlight") {
			this.highlights.push(annotation);
		}

		if (type === "underline") {
			this.underlines.push(annotation);
		}

		if (type === "mark") {
			this.marks.push(annotation);
		}

		if (sectionIndex in this._annotationsBySectionIndex) {
			this._annotationsBySectionIndex[sectionIndex].push(hash);
		} else {
			this._annotationsBySectionIndex[sectionIndex] = [hash];
		}

		let views = this.rendition.views();

		views.forEach( (view) => {
			if (annotation.sectionIndex === view.index) {
				annotation.attach(view);
			}
		});

		return annotation;
	}

	/**
	 * Remove an annotation from store
	 * @param {EpubCFI} cfiRange EpubCFI range the annotation is attached to
	 * @param {string} type Type of annotation to add: "highlight", "underline", "mark"
	 */
	remove (cfiRange, type) {
		let hash = encodeURI(cfiRange + type);

		if (hash in this._annotations) {
			let annotation = this._annotations[hash];

			if (type && annotation.type !== type) {
				return;
			}

			let views = this.rendition.views();
			views.forEach( (view) => {
				this._removeFromAnnotationBySectionIndex(annotation.sectionIndex, hash);
				if (annotation.sectionIndex === view.index) {
					annotation.detach(view);
				}
			});

			this.highlights = this.highlights.filter(item => item.type !== type && item.cfiRange !== cfiRange);
			this.underlines = this.underlines.filter(item => item.type !== type && item.cfiRange !== cfiRange);
			this.marks = this.marks.filter(item => item.type !== type && item.cfiRange !== cfiRange);
			delete this._annotations[hash];
		}
	}

	/**
	 * Remove an annotations by Section Index
	 * @private
	 */
	_removeFromAnnotationBySectionIndex (sectionIndex, hash) {
		this._annotationsBySectionIndex[sectionIndex] = this._annotationsAt(sectionIndex).filter(h => h !== hash);
	}

	/**
	 * Get annotations by Section Index
	 * @private
	 */
	_annotationsAt (index) {
		return this._annotationsBySectionIndex[index];
	}


	/**
	 * Add a highlight to the store
	 * @param {EpubCFI} cfiRange EpubCFI range to attach annotation to
	 * @param {object} data Data to assign to annotation
	 * @param {function} cb Callback after annotation is clicked
	 * @param {string} className CSS class to assign to annotation
	 * @param {object} styles CSS styles to assign to annotation
	 * @param {EpubCFI} cfiRangeText EpubCFI range text to attach annotation to
	 */
	highlight (cfiRange, data, cb, className, styles, cfiRangeText) {
		return this.add("highlight", cfiRange, data, cb, className, styles, cfiRangeText);
	}

	/**
	 * Add a underline to the store
	 * @param {EpubCFI} cfiRange EpubCFI range to attach annotation to
	 * @param {object} data Data to assign to annotation
	 * @param {function} cb Callback after annotation is clicked
	 * @param {string} className CSS class to assign to annotation
	 * @param {object} styles CSS styles to assign to annotation
	 * @param {EpubCFI} cfiRangeText EpubCFI range text to attach annotation to
	 */
	underline (cfiRange, cfiRangeText, data, cb, className, styles) {
		return this.add("underline", cfiRange, data, cb, className, styles, cfiRangeText);
	}

	/**
	 * Add a mark to the store
	 * @param {EpubCFI} cfiRange EpubCFI range to attach annotation to
	 * @param {object} data Data to assign to annotation
	 * @param {function} cb Callback after annotation is clicked
	 * @param {EpubCFI} cfiRangeText EpubCFI range text to attach annotation to
	 */
	mark (cfiRange, data, cb, cfiRangeText) {
		return this.add("mark", cfiRange, data, cb, cfiRangeText);
	}

	/**
	 * iterate over annotations in the store
	 */
	each () {
		const annotations = [...this.highlights, ...this.underlines, ...this.marks];
		return annotations;
	}

	/**
	 * Hook for injecting annotation into a view
	 * @param {View} view
	 * @private
	 */
	inject (view) {
		let sectionIndex = view.index;
		if (sectionIndex in this._annotationsBySectionIndex) {
			let annotations = this._annotationsBySectionIndex[sectionIndex];
			annotations.forEach((hash) => {
				let annotation = this._annotations[hash];
				annotation.attach(view);
			});
		}
	}

	/**
	 * Hook for removing annotation from a view
	 * @param {View} view
	 * @private
	 */
	clear (view) {
		let sectionIndex = view.index;
		if (sectionIndex in this._annotationsBySectionIndex) {
			let annotations = this._annotationsBySectionIndex[sectionIndex];
			annotations.forEach((hash) => {
				let annotation = this._annotations[hash];
				annotation.detach(view);
			});
		}
	}

	/**
	 * [Not Implemented] Show annotations
	 * @TODO: needs implementation in View
	 */
	show () {

	}

	/**
	 * [Not Implemented] Hide annotations
	 * @TODO: needs implementation in View
	 */
	hide () {

	}

}

/**
 * Annotation object
 * @class
 * @param {object} options
 * @param {string} options.type Type of annotation to add: "highlight", "underline", "mark"
 * @param {EpubCFI} options.cfiRange EpubCFI range to attach annotation to
 * @param {object} options.data Data to assign to annotation
 * @param {int} options.sectionIndex Index in the Spine of the Section annotation belongs to
 * @param {function} [options.cb] Callback after annotation is clicked
 * @param {string} className CSS class to assign to annotation
 * @param {object} styles CSS styles to assign to annotation
 * @param {EpubCFI} options.cfiRangeText EpubCFI range text to attach annotation to
 * @returns {Annotation} annotation
 */
class Annotation {

	constructor ({
		type,
		cfiRange,
		data,
		sectionIndex,
		cb,
		className,
		styles,
		cfiRangeText,
	}) {
		this.type = type;
		this.cfiRange = cfiRange;
		this.cfiRangeText = cfiRangeText;
		this.data = data;
		this.sectionIndex = sectionIndex;
		this.mark = undefined;
		this.cb = cb;
		this.className = className;
		this.styles = styles;
	}

	/**
	 * Update stored data
	 * @param {object} data
	 */
	update (data = {}, styles = {}) {
		if (this.data) this.data = data;
		if (!this.styles) this.styles = {};

		if (styles?.stroke) {
			if (this.mark?.attributes?.stroke) {
				this.mark.attributes.stroke = styles.stroke;
			}

			this.styles.stroke = styles.stroke;
		}
		
		if (styles?.["stroke-opacity"]) {
			if (this.mark?.attributes?.["stroke-opacity"]) {
				this.mark.attributes["stroke-opacity"] = styles["stroke-opacity"];
			}
			
			this.styles["stroke-opacity"] = styles["stroke-opacity"];
		}

		if (styles?.["stroke-width"]) {
			if (this.mark?.attributes?.["stroke-width"]) {
				this.mark.attributes["stroke-width"] = styles["stroke-width"];
			}

			this.styles["stroke-width"] = styles["stroke-width"];
		}

		if (styles?.fill) {
			if (this.mark?.attributes?.fill) {
				this.mark.attributes.fill = styles.fill;
			}

			this.styles.fill = styles.fill;
		}

		if (styles?.["fill-opacity"]) {
			if (this.mark?.attributes?.["fill-opacity"]) {
				this.mark.attributes["fill-opacity"] = styles["fill-opacity"];
			}
			
			this.styles["fill-opacity"] = styles["fill-opacity"];
		}
	}

	/**
	 * Add to a view
	 * @param {View} view
	 */
	attach (view) {
		let {cfiRange, cfiRangeText, data, type, mark, cb, className, styles} = this;
		let result;

		if (type === "highlight") {
			result = view.highlight(cfiRange, data, cb, className, styles, cfiRangeText);
		} else if (type === "underline") {
			result = view.underline(cfiRange, data, cb, className, styles, cfiRangeText);
		} else if (type === "mark") {
			result = view.mark(cfiRange, data, cb, className, styles, cfiRangeText);
		}

		this.mark = result;
		this.emit(EVENTS.ANNOTATION.ATTACH, result);
		return result;
	}

	/**
	 * Remove from a view
	 * @param {View} view
	 */
	detach (view) {
		let {cfiRange, type} = this;
		let result;

		if (view) {
			if (type === "highlight") {
				result = view.unhighlight(cfiRange);
			} else if (type === "underline") {
				result = view.ununderline(cfiRange);
			} else if (type === "mark") {
				result = view.unmark(cfiRange);
			}
		}

		this.mark = undefined;
		this.emit(EVENTS.ANNOTATION.DETACH, result);
		return result;
	}

	/**
	 * [Not Implemented] Get text of an annotation
	 * @TODO: needs implementation in contents
	 */
	text () {

	}

}

EventEmitter(Annotation.prototype);


export default Annotations;
