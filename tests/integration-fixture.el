;;; integration-fixture.el --- Real export fixture for browser checks -*- lexical-binding: t; -*-
(require 'test-helper)

(defun denote-explore-test-export-integration (&optional count)
  "Print real JSON/HTML export packet.  COUNT >= 5 creates a large star/ring."
  (denote-explore-test-with-directory
    (if (and count (>= count 5))
        (dotimes (index count)
          (let* ((n (1+ index))
                 (signature (nth index '("1" "1=1" "1=1=1")))
                 (targets (cond ((= n 1) '(4))
                                ((= n 4) (cons 1 (number-sequence 5 count)))
                                ((>= n 5) (list (if (= n count) 5 (1+ n)))))))
            (denote-explore-test-note n signature
                                      (mapconcat #'denote-explore-test-link targets "\n"))))
      (denote-explore-test-context-fixture))
    (let* ((start (float-time)) (scans 0)
           (extract (symbol-function 'denote-explore--network-extract-edges))
           (graph (cl-letf (((symbol-function 'denote-explore--network-extract-edges)
                            (lambda (files) (cl-incf scans) (funcall extract files))))
                    (denote-explore-network-sequence-graph "1" t 2)))
           (elapsed (- (float-time) start))
           (denote-explore-network-directory denote-directory)
           (denote-explore-network-filename "integration")
           (denote-explore-network-d3-template
            (expand-file-name "denote-explore-network.html" denote-explore-test-root))
           (denote-explore-network-d3-js "/d3.js")
           (denote-explore-network-d3-colours 'schemeCategory10)
           (json-file (expand-file-name "integration.json" denote-directory))
           (html-file (expand-file-name "integration.html" denote-directory)))
      (with-temp-file json-file (denote-explore-network-encode-json graph))
      (cl-letf (((symbol-function 'browse-url-default-browser) #'ignore))
        (denote-explore-network-display-json json-file))
      (princ (json-encode
              `((json . ,(with-temp-buffer (insert-file-contents json-file) (buffer-string)))
                (html . ,(with-temp-buffer (insert-file-contents html-file) (buffer-string)))
                (generationSeconds . ,elapsed) (extractorCalls . ,scans)))))))

;;; integration-fixture.el ends here
