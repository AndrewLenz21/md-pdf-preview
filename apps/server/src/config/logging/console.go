package logging

import (
	"fmt"
	"os"
	"strings"
	"sync"
	"time"
)

var consoleMu sync.Mutex

// Printf writes one timestamped, serialized console line.
func Printf(format string, args ...any) {
	write(fmt.Sprintf(format, args...))
}

// Println writes one timestamped, serialized console line.
func Println(args ...any) {
	write(strings.TrimSuffix(fmt.Sprintln(args...), "\n"))
}

func write(message string) {
	consoleMu.Lock()
	defer consoleMu.Unlock()

	message = strings.TrimSuffix(message, "\n")
	fmt.Fprintf(os.Stdout, "[%s] %s\n", time.Now().Format("15:04:05.000"), message)
}
