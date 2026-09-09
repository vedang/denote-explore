;;; check-lisp.el --- Source validation without root build artifacts -*- lexical-binding: t; -*-
(require 'bytecomp)
(let ((files (cons (expand-file-name "denote-explore.el" denote-explore-test-root)
                   (directory-files (expand-file-name "tests" denote-explore-test-root)
                                    t "\\.el\\'")))
      (output (expand-file-name "tests/artifacts" denote-explore-test-root)))
  (make-directory output t)
  (dolist (file files)
    (with-temp-buffer
      (insert-file-contents file)
      (emacs-lisp-mode)
      (check-parens)))
  (let ((byte-compile-dest-file-function
         (lambda (file) (expand-file-name
                         (concat (file-name-base file) ".elc") output))))
    (unless (byte-compile-file (car files))
      (error "Byte compilation failed"))))
;;; check-lisp.el ends here
