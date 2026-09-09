;;; smoke-test.el --- Dependency setup checks -*- lexical-binding: t; -*-

(ert-deftest denote-explore-smoke-load ()
  (should (featurep 'denote-explore))
  (should (featurep 'denote))
  (should (featurep 'dash))
  (should (fboundp '-frequencies))
  (should (featurep 'denote-regexp))
  (should (featurep 'denote-sequence)))

(ert-deftest denote-explore-smoke-sequence-schemes ()
  (dolist (case '((numeric "1=2=3" ("1" "2" "3"))
                  (alphanumeric "1b3" ("1" "b" "3"))))
    (let ((denote-sequence-scheme (car case)))
      (should (equal (denote-sequence-split (cadr case)) (nth 2 case)))
      (should (equal (denote-sequence-join (nth 2 case) denote-sequence-scheme)
                     (cadr case))))))

(ert-deftest denote-explore-smoke-optional-sequence-guard ()
  (let ((features (remq 'denote-sequence features)))
    (should-error (denote-explore-network-sequence-graph "1" t)
                  :type 'user-error)
    (should (featurep 'denote-explore))
    (should (fboundp 'denote-explore-network-community-graph))))

;;; smoke-test.el ends here
