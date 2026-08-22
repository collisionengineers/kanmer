# Research

Review thread 3836323268 at CORE-058 head `f0de2628` found that orphan creation can copy a source `.kanmer` and then pause on ignore repair before source cleanup/board commit. A later retry must resume the migration steps, not only repair the ignore file.
