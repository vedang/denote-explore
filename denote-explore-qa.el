;;; denote-explore-qa.el --- Quality assurance functions for denote -*- lexical-binding: t -*-

;; Copyright (C) 2023 Peter Prevos

;; Author: Peter Prevos <peter@prevos.net>
;; URL: https://github.com/pprevos/denote-extra/
;; Package-Requires: ((emacs "28.2") (dash "2.19.1") (f "0.20.0"))

;; This file is NOT part of GNU Emacs.

;; This program is free software; you can redistribute it and/or modify
;; it under the terms of the GNU General Public License as published by
;; the Free Software Foundation, either version 3 of the License, or
;; (at your option) any later version.
;;
;; This program is distributed in the hope that it will be useful,
;; but WITHOUT ANY WARRANTY; without even the implied warranty of
;; MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
;; GNU General Public License for more details.
;;
;; You should have received a copy of the GNU General Public License
;; along with this program.  If not, see <https://www.gnu.org/licenses/>.

;;; Commentary:
;;
;; Functions to manage the integrity of your Denote files.
;;
;; 1. `denote-explore-single-keywords': List of keywords only used once.
;; 2. `denote-explore-sync-metadata': Synchronise filenames with front matter.

;;; Code:

(require 'denote-explore)

;; Quality Assurance

;;;###autoload
(defun denote-explore-sync-metadata ()
  "Synchronise the filenames with the metadata for all Denote files."
  (interactive)
  (save-some-buffers)
  ;; TODO add option to not confirm save
  (let ((notes (denote-directory-text-only-files)))
    (dolist (file notes)
      (message file)
      (denote-rename-file-using-front-matter file)))
  (message "Integrity check completed"))

;;;###autoload
(defun denote-explore-single-keywords ()
  "List Denote keywords only used once."
  (interactive)
  (let* ((keywords (denote-explore--count-keywords))
	 (single (cl-remove-if
		  (lambda (pair) (> (cdr pair) 1)) keywords)))
    (message "Single keywords: %s"
	     (mapconcat 'identity (mapcar #'car single) ", "))))




(defun denote-explore-order-keywords ()
  "Order the keywords in all Denote files alphabetically."
  (interactive)
  (save-some-buffers)
  (let ((notes (denote-directory-text-only-files)))
    (dolist (file notes)
      (let ((file-type (denote-filetype-heuristics file))
	    (keywords (denote-retrieve-keywords-value file file-type)))
	(when (not (equal keywords (denote-keywords-sort keywords)))
	  (message file)
	  )
	))))

  (message "All keywords ordered alphabetically")

(provide 'denote-explore-qa)
;;; denote-explore-qa.el ends here
