// Package telemetry reads system stats from Linux /proc and /sys.
// All reads are best-effort; missing files return zero values.
package telemetry

import (
	"bufio"
	"net"
	"os"
	"strconv"
	"strings"
	"time"
)

// Snapshot holds a single point-in-time system reading.
type Snapshot struct {
	CPUPercent float64
	MemMB      float64
	TempC      float64
	UptimeS    int64
	WiFiDBM    int
	IPAddress  string
}

// Read collects a full snapshot. CPU measurement takes ~500ms (two /proc/stat samples).
func Read() Snapshot {
	return Snapshot{
		CPUPercent: readCPU(),
		MemMB:      readMem(),
		TempC:      readTemp(),
		UptimeS:    readUptime(),
		WiFiDBM:    readWiFi(),
		IPAddress:  readIP(),
	}
}

// readCPU samples /proc/stat twice with a 500ms gap to compute usage %.
func readCPU() float64 {
	s1 := cpuStat()
	time.Sleep(500 * time.Millisecond)
	s2 := cpuStat()
	total := float64((s2[0] + s2[1] + s2[2] + s2[3]) - (s1[0] + s1[1] + s1[2] + s1[3]))
	idle := float64(s2[3] - s1[3])
	if total == 0 {
		return 0
	}
	return (1 - idle/total) * 100
}

// cpuStat returns [user, nice, system, idle] jiffies from the first cpu line.
func cpuStat() [4]uint64 {
	f, err := os.Open("/proc/stat")
	if err != nil {
		return [4]uint64{}
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := sc.Text()
		if !strings.HasPrefix(line, "cpu ") {
			continue
		}
		fields := strings.Fields(line)
		var v [4]uint64
		for i := 0; i < 4 && i+1 < len(fields); i++ {
			v[i], _ = strconv.ParseUint(fields[i+1], 10, 64)
		}
		return v
	}
	return [4]uint64{}
}

// readMem returns used memory in MB (MemTotal - MemAvailable).
func readMem() float64 {
	f, err := os.Open("/proc/meminfo")
	if err != nil {
		return 0
	}
	defer f.Close()
	vals := map[string]uint64{}
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		fields := strings.Fields(sc.Text())
		if len(fields) >= 2 {
			v, _ := strconv.ParseUint(fields[1], 10, 64)
			vals[strings.TrimSuffix(fields[0], ":")] = v
		}
	}
	return float64(vals["MemTotal"]-vals["MemAvailable"]) / 1024 // kB → MB
}

// readTemp reads the SoC temperature in °C from the thermal zone.
func readTemp() float64 {
	data, err := os.ReadFile("/sys/class/thermal/thermal_zone0/temp")
	if err != nil {
		return 0
	}
	v, _ := strconv.ParseFloat(strings.TrimSpace(string(data)), 64)
	return v / 1000.0 // millidegrees → °C
}

// readUptime returns system uptime in seconds.
func readUptime() int64 {
	data, err := os.ReadFile("/proc/uptime")
	if err != nil {
		return 0
	}
	fields := strings.Fields(string(data))
	if len(fields) == 0 {
		return 0
	}
	f, _ := strconv.ParseFloat(fields[0], 64)
	return int64(f)
}

// readWiFi returns the WiFi signal level in dBm from /proc/net/wireless.
func readWiFi() int {
	f, err := os.Open("/proc/net/wireless")
	if err != nil {
		return 0
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	n := 0
	for sc.Scan() {
		n++
		if n <= 2 { // skip two header lines
			continue
		}
		fields := strings.Fields(sc.Text())
		if len(fields) < 4 {
			continue
		}
		v, _ := strconv.ParseFloat(strings.TrimSuffix(fields[3], "."), 64)
		return int(v)
	}
	return 0
}

// readIP returns the first non-loopback IPv4 address.
func readIP() string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return ""
	}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, _ := iface.Addrs()
		for _, addr := range addrs {
			if ipnet, ok := addr.(*net.IPNet); ok {
				if ip := ipnet.IP.To4(); ip != nil {
					return ip.String()
				}
			}
		}
	}
	return ""
}
