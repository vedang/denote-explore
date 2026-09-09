;;; bootstrap.el --- Hermetic test loader -*- lexical-binding: t; -*-

(require 'ert)
(require 'cl-lib)

(defconst denote-explore-test-root
  (file-name-directory (directory-file-name
                        (file-name-directory (or load-file-name buffer-file-name)))))
(defconst denote-explore-test-deps
  (or (getenv "DENOTE_EXPLORE_TEST_DEPS")
      (expand-file-name "tests/.deps" denote-explore-test-root)))

(unless (file-directory-p denote-explore-test-deps)
  (error "Missing test dependencies; run python3 tests/setup-deps.py"))
(dolist (directory (directory-files denote-explore-test-deps t "^[^.].*"))
  (when (file-directory-p directory)
    (add-to-list 'load-path directory)))
(add-to-list 'load-path denote-explore-test-root)
(add-to-list 'load-path (expand-file-name "tests" denote-explore-test-root))

;; Do not discover or initialize the user's note directory during package load.
(setq denote-directory (make-temp-file "denote-explore-bootstrap-" t))
(add-hook 'kill-emacs-hook
          (lambda () (delete-directory denote-directory t)))
(require 'denote-explore)
(dolist (test (directory-files (expand-file-name "tests" denote-explore-test-root)
                              t "-test\\.el\\'"))
  (load test nil t))

;;; bootstrap.el ends here
