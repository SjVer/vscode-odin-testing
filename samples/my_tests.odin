package my_tests

import "core:testing"

@(test)
foo :: proc(t: ^testing.T) {
    testing.expect(t, 1 != 2, "this is a message")
}

@(test)
bar :: proc(t: ^testing.T) {
    testing.expect(t, true, "this is an error message")
}

