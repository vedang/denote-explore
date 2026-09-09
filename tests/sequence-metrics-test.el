;;; sequence-metrics-test.el --- Typed versus document metrics -*- lexical-binding: t; -*-
(require 'test-helper)

(ert-deftest denote-explore-metrics-typed-relationships ()
  (denote-explore-test-with-directory
    (denote-explore-test-context-fixture)
    (let* ((graph (denote-explore-network-sequence-graph "1" t 1))
           (meta (alist-get 'meta graph)))
      (dolist (entry '((contextDepth . 1) (sequenceCount . 3) (contextCount . 2)
                       (nodeCount . 5) (hierarchyEdgeCount . 2) (linkEdgeCount . 8)
                       (linkOccurrenceCount . 10)))
        (should (equal (alist-get (car entry) meta) (cdr entry))))
      (dolist (case '((1 4 3 2 2) (2 5 3 2 1) (3 3 2 2 1) (5 3 3 4 4)))
        (let ((node (denote-explore-test-node graph (car case))))
          (cl-loop for field in '(degree actualDegree backlinks actualBacklinks)
                   for expected in (cdr case)
                   do (should (equal (alist-get field node) expected))))))))

(ert-deftest denote-explore-metrics-depth-zero-and-singleton ()
  (denote-explore-test-with-directory
    (denote-explore-test-note 1 "1")
    (denote-explore-test-note 2 "1=1")
    (let* ((graph (denote-explore-network-sequence-graph "1" t))
           (b (denote-explore-test-node graph 2)))
      (should (= (alist-get 'backlinks b) 1))
      (should (= (alist-get 'actualBacklinks b) 0))
      (should (= (alist-get 'actualDegree b) 0)))
    (let ((node (denote-explore-test-node (denote-explore-network-sequence-graph "1=1" t) 2)))
      (dolist (field '(degree backlinks actualDegree actualBacklinks))
        (should (= (alist-get field node) 0))))))

(ert-deftest denote-explore-metrics-community-baseline ()
  (denote-explore-test-with-directory
    (denote-explore-test-note 1 nil (concat (denote-explore-test-link 2) "\n" (denote-explore-test-link 2)))
    (denote-explore-test-note 2 nil)
    (let* ((graph (denote-explore-network-community-graph "" t))
           (b (denote-explore-test-node graph 2)))
      (should (= (alist-get 'degree b) 1))
      (should (= (alist-get 'backlinks b) 2))
      (should-not (assq 'actualBacklinks b))
      (should (= (alist-get 'weight (denote-explore-test-edge graph 1 2)) 2)))))

;;; sequence-metrics-test.el ends here
