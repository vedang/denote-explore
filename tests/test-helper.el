;;; test-helper.el --- Synthetic note fixtures -*- lexical-binding: t; -*-
(require 'cl-lib)
(require 'denote-explore)

(defmacro denote-explore-test-with-directory (&rest body)
  "Evaluate BODY with a fresh, isolated Denote directory."
  (declare (indent 0) (debug t))
  `(let ((denote-directory (make-temp-file "denote-explore-fixture-" t))
         (denote-excluded-directories-regexp nil)
         (denote-excluded-files-regexp nil)
         (denote-explore-network-regex-ignore nil)
         (denote-explore-network-previous '("Sequence" "1"))
         (denote-sequence-scheme 'numeric))
     (unwind-protect (progn ,@body)
       (delete-directory denote-directory t))))

(defun denote-explore-test-id (number)
  (format "20260101T%06d" number))

(defun denote-explore-test-note (number signature &optional contents extension subdirectory)
  "Write synthetic NUMBER note; optional SIGNATURE, CONTENTS and EXTENSION."
  (let* ((name (format "%s%s--note-%s.%s"
                       (denote-explore-test-id number)
                       (if signature (concat "==" signature) "")
                       number (or extension "org")))
         (directory (if subdirectory (expand-file-name subdirectory denote-directory)
                      denote-directory))
         (file (expand-file-name name directory)))
    (make-directory directory t)
    (with-temp-file file
      (insert (format "#+title: Note %s\n\n%s" number (or contents ""))))
    file))

(defun denote-explore-test-link (number)
  (format "[[denote:%s][Note %s]]" (denote-explore-test-id number) number))

(defun denote-explore-test-ids (graph)
  (sort (mapcar (lambda (node) (alist-get 'id node)) (alist-get 'nodes graph))
        #'string<))

(defun denote-explore-test-node (graph number)
  (seq-find (lambda (node) (equal (alist-get 'id node) (denote-explore-test-id number)))
            (alist-get 'nodes graph)))

(defun denote-explore-test-edge (graph source target &optional kind)
  (seq-find (lambda (edge)
              (and (equal (alist-get 'source edge) (denote-explore-test-id source))
                   (equal (alist-get 'target edge) (denote-explore-test-id target))
                   (or (null kind) (equal (alist-get 'kind edge) kind))))
            (alist-get 'edges graph)))

(defun denote-explore-test-no-dangling (graph)
  (let ((ids (denote-explore-test-ids graph)))
    (dolist (edge (alist-get 'edges graph))
      (should (member (alist-get 'source edge) ids))
      (should (member (alist-get 'target edge) ids)))))

(provide 'test-helper)
;;; test-helper.el ends here
