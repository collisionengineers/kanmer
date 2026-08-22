# Research

Review thread 3836307985 at CORE-058 head `f0de2628` found that retry restores availability but does not re-arm the already-enabled automatic sync timer. The paused state must remain until retry succeeds; success must restore exactly the saved interval.
