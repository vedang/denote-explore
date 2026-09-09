;;; sequence-membership-test.el --- Structural membership regressions -*- lexical-binding: t; -*-
(require 'test-helper)

(ert-deftest denote-explore-membership-component-prefix ()
  (denote-explore-test-with-directory
    (cl-loop for sig in '("1" "1=1" "1=1=1" "10" "10=1")
             for n from 1 do (denote-explore-test-note n sig))
    (let ((graph (denote-explore-network-sequence-graph "1" t)))
      (should (equal (denote-explore-test-ids graph)
                     (mapcar #'denote-explore-test-id '(1 2 3))))
      (should (= (length (alist-get 'edges graph)) 2))
      (denote-explore-test-no-dangling graph))))

(ert-deftest denote-explore-membership-alphanumeric ()
  (denote-explore-test-with-directory
    (let ((denote-sequence-scheme 'alphanumeric))
      (cl-loop for sig in '("1" "1a" "1a1" "1b" "10" "10a")
               for n from 1 do (denote-explore-test-note n sig))
      (let ((graph (denote-explore-network-sequence-graph "1a" t)))
        (should (equal (denote-explore-test-ids graph)
                       (mapcar #'denote-explore-test-id '(2 3))))
        (denote-explore-test-no-dangling graph)))))

(ert-deftest denote-explore-membership-singleton ()
  (denote-explore-test-with-directory
    (denote-explore-test-note 1 "1")
    (let ((graph (denote-explore-network-sequence-graph "1" t)))
      (should (equal (denote-explore-test-ids graph) (list (denote-explore-test-id 1))))
      (should-not (alist-get 'edges graph)))))

(ert-deftest denote-explore-membership-empty-root-all-signed ()
  (denote-explore-test-with-directory
    (denote-explore-test-note 1 "1")
    (denote-explore-test-note 2 "2")
    (denote-explore-test-note 3 nil)
    (let ((graph (denote-explore-network-sequence-graph "" t)))
      (should (equal (denote-explore-test-ids graph)
                     (mapcar #'denote-explore-test-id '(1 2))))
      (should-not (alist-get 'edges graph)))))

(ert-deftest denote-explore-membership-missing-parent ()
  (denote-explore-test-with-directory
    (denote-explore-test-note 1 "1=1")
    (denote-explore-test-note 2 "1=1=1")
    (let ((graph (denote-explore-network-sequence-graph "1" t)))
      (should (= (length (alist-get 'nodes graph)) 2))
      (should (= (length (alist-get 'edges graph)) 1))
      (should (denote-explore-test-edge graph 1 2))
      (denote-explore-test-no-dangling graph))))

(ert-deftest denote-explore-membership-literal-not-regexp ()
  (denote-explore-test-with-directory
    (denote-explore-test-note 1 "1")
    (denote-explore-test-note 2 "1=1")
    (should-error (denote-explore-network-sequence-graph "1.*" t) :type 'user-error)))

(ert-deftest denote-explore-membership-empty-selection ()
  (denote-explore-test-with-directory
    (denote-explore-test-note 1 "1")
    (should-error (denote-explore-network-sequence-graph "9" t) :type 'user-error)))

(ert-deftest denote-explore-membership-duplicate-signature ()
  (denote-explore-test-with-directory
    (denote-explore-test-note 1 "1")
    (denote-explore-test-note 2 "1")
    (should-error (denote-explore-network-sequence-graph "1" t) :type 'user-error)))

;;; sequence-membership-test.el ends here
