;;; sequence-context-test.el --- Context traversal and topology -*- lexical-binding: t; -*-
(require 'test-helper)

(defun denote-explore-test-context-fixture ()
  "Create A/B/C sequence and X/Y/Z/W context with cycles and repeated links."
  (denote-explore-test-note 1 "1" (concat (denote-explore-test-link 2) "\n" (denote-explore-test-link 99)))
  (denote-explore-test-note 2 "1=1" (concat (denote-explore-test-link 5) " "
      (denote-explore-test-link 5) "\n" (denote-explore-test-link 5) "\n" (denote-explore-test-link 1)))
  (denote-explore-test-note 3 "1=1=1" (concat (denote-explore-test-link 3) "\n" (denote-explore-test-link 4)))
  (denote-explore-test-note 4 nil (concat (denote-explore-test-link 1) "\n" (denote-explore-test-link 5)))
  (denote-explore-test-note 5 nil (denote-explore-test-link 4))
  (denote-explore-test-note 6 nil (denote-explore-test-link 4))
  (denote-explore-test-note 7 nil))

(defun denote-explore-test-context (depth &optional text-only)
  "Call the frozen index helper seam, failing by assertion if absent."
  (should (fboundp 'denote-explore--network-sequence-context))
  (funcall 'denote-explore--network-sequence-context "1" text-only depth))

(defun denote-explore-test-context-ids (context)
  (sort (mapcar #'denote-retrieve-filename-identifier (alist-get 'files context)) #'string<))

(ert-deftest denote-explore-context-extractor-real-occurrences ()
  (denote-explore-test-with-directory
    (let* ((file (denote-explore-test-note 1 "1"
                   (concat (denote-explore-test-link 2) " " (denote-explore-test-link 3)
                           " " (denote-explore-test-link 2) "\n" (denote-explore-test-link 2))))
           (_b (denote-explore-test-note 2 nil)) (_c (denote-explore-test-note 3 nil))
           (edges (denote-explore--network-extract-edges (list file))))
      (should (= (length edges) 4))
      (should (= (cl-count (denote-explore-test-id 2) edges
                           :key (lambda (e) (alist-get 'target e)) :test #'equal) 3)))))

(ert-deftest denote-explore-context-index-distances-and-exhaustion ()
  (denote-explore-test-with-directory
    (denote-explore-test-context-fixture)
    (dolist (case '((0 1 2 3) (1 1 2 3 4 5) (2 1 2 3 4 5 6) (100 1 2 3 4 5 6)))
      (let* ((depth (car case)) (context (denote-explore-test-context depth t))
             (distances (alist-get 'distances context)))
        (should (hash-table-p distances))
        (should (equal (denote-explore-test-context-ids context)
                       (mapcar #'denote-explore-test-id (cdr case))))
        (dolist (id '(1 2 3)) (should (= (gethash (denote-explore-test-id id) distances) 0)))
        (when (> depth 0)
          (dolist (id '(4 5)) (should (= (gethash (denote-explore-test-id id) distances) 1))))
        (when (> depth 1) (should (= (gethash (denote-explore-test-id 6) distances) 2)))))))

(ert-deftest denote-explore-context-index-scan-once ()
  (denote-explore-test-with-directory
    (denote-explore-test-context-fixture)
    (let ((extract (symbol-function 'denote-explore--network-extract-edges)) (calls 0))
      (cl-letf (((symbol-function 'denote-explore--network-extract-edges)
                 (lambda (files) (cl-incf calls) (funcall extract files))))
        (denote-explore-test-context 0 t)
        (should (= calls 0))
        (let ((context (denote-explore-test-context 100 t)))
          (should (= calls 1))
          (should (= (length (alist-get 'edges context)) 11))
          (should (= (cl-count (denote-explore-test-id 5) (alist-get 'edges context)
                               :key (lambda (e) (alist-get 'target e)) :test #'equal) 4)))))))

(ert-deftest denote-explore-context-index-incoming-only ()
  (denote-explore-test-with-directory
    (denote-explore-test-note 1 "1")
    (denote-explore-test-note 2 nil (denote-explore-test-link 1))
    (should (equal (denote-explore-test-context-ids (denote-explore-test-context 1 t))
                   (mapcar #'denote-explore-test-id '(1 2))))))

(ert-deftest denote-explore-context-index-eligible-boundary ()
  (denote-explore-test-with-directory
    (denote-explore-test-note 1 "1" (mapconcat #'denote-explore-test-link '(2 3 4 5 99) "\n"))
    (denote-explore-test-note 2 nil nil "png")
    (denote-explore-test-note 3 nil (denote-explore-test-link 6))
    (denote-explore-test-note 4 nil nil nil "excluded")
    (denote-explore-test-note 5 nil (denote-explore-test-link 6))
    (denote-explore-test-note 6 nil)
    (let ((denote-excluded-files-regexp "--note-3\\.")
          (denote-excluded-directories-regexp "excluded")
          (denote-explore-network-regex-ignore "--note-5\\."))
      (should (equal (denote-explore-test-context-ids (denote-explore-test-context 2 t))
                     (list (denote-explore-test-id 1))))
      (should (equal (denote-explore-test-context-ids (denote-explore-test-context 2 nil))
                     (mapcar #'denote-explore-test-id '(1 2)))))))

(ert-deftest denote-explore-context-index-duplicate-id ()
  (denote-explore-test-with-directory
    (denote-explore-test-note 1 "1")
    (denote-explore-test-note 1 "2")
    (should (fboundp 'denote-explore--network-sequence-context))
    (should-error (funcall 'denote-explore--network-sequence-context "1" t 0) :type 'user-error)))

(ert-deftest denote-explore-context-graph-depth-zero-hierarchy-only ()
  (denote-explore-test-with-directory
    (denote-explore-test-context-fixture)
    (let ((graph (denote-explore-network-sequence-graph "1" t)))
      (should (= (length (alist-get 'edges graph)) 2))
      (dolist (edge (alist-get 'edges graph)) (should (equal (alist-get 'kind edge) "hierarchy")))
      (dolist (node (alist-get 'nodes graph))
        (should (eq (alist-get 'sequenceMember node) t))
        (should (= (alist-get 'contextDistance node) 0))))))

(ert-deftest denote-explore-context-graph-induced-typed-weighted ()
  (denote-explore-test-with-directory
    (denote-explore-test-context-fixture)
    (let* ((graph (denote-explore-network-sequence-graph "1" t 1))
           (edges (alist-get 'edges graph)))
      (should (equal (denote-explore-test-ids graph) (mapcar #'denote-explore-test-id '(1 2 3 4 5))))
      (should (= (length edges) 10))
      (should (= (alist-get 'weight (denote-explore-test-edge graph 2 5 "link")) 3))
      (dolist (spec '((1 2 "hierarchy") (1 2 "link") (2 1 "link") (3 3 "link") (4 5 "link")))
        (should (apply #'denote-explore-test-edge graph spec)))
      (should (eq (alist-get 'sequenceMember (denote-explore-test-node graph 4)) :json-false))
      (should (= (alist-get 'contextDistance (denote-explore-test-node graph 4)) 1))
      (should (= (length (delete-dups (mapcar (lambda (e) (alist-get 'key e)) edges))) 10))
      (dolist (edge edges)
        (should (equal (json-read-from-string (alist-get 'key edge))
                       (vector (alist-get 'kind edge) (alist-get 'source edge) (alist-get 'target edge)))))
      (denote-explore-test-no-dangling graph))))

(ert-deftest denote-explore-context-warning-threshold-and-no-truncation ()
  (denote-explore-test-with-directory
    (denote-explore-test-context-fixture)
    (dolist (threshold '(5 6 7))
      (let ((denote-explore-network-context-warning-threshold threshold) (warnings nil))
        (cl-letf (((symbol-function 'display-warning)
                   (lambda (&rest args) (push args warnings))))
          (let ((graph (denote-explore-network-sequence-graph "1" t 2)))
            (should (= (length (alist-get 'nodes graph)) 6))
            (should (= (length warnings) (if (<= threshold 6) 1 0)))))))))

;;; sequence-context-test.el ends here
