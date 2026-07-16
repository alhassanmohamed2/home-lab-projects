import subprocess
import re
from http.server import BaseHTTPRequestHandler, HTTPServer

class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Run radeontop to get a snapshot
        cmd = "radeontop -d - -l 1"

        try:
            output = subprocess.check_output(cmd, shell=True).decode("utf-8")

            # Dictionary to map radeontop abbreviations to readable names
            # These match the standard output of radeontop
            metrics_map = {
                "gpu": "gpu_usage_percent",
                "vram": "vram_usage_percent",
                "gtt": "gtt_memory_percent",      # System RAM used by GPU
                "mclk": "memory_clock_percent",   # Memory Clock Load
                "sclk": "shader_clock_percent",   # Core Clock Load
                "ee": "event_engine_percent",
                "vgt": "vertex_grouper_percent",  # Geometry/Polygons
                "ta": "texture_addresser_percent",# Texture Lookups
                "sx": "shader_export_percent",
                "spi": "shader_interpolator_percent",
                "sc": "scan_converter_percent",
                "pa": "primitive_assembly_percent",
                "db": "depth_block_percent",      # Z-Buffer operations
                "cb": "color_block_percent"       # ROPs / Final color output
            }

            response_lines = []

            # Parse the output. Example output snippet:
            # "gpu 10.0%, ee 0.0%, vgt 5.0% ..."
            for key, name in metrics_map.items():
                # Regex looks for "key 12.3%"
                # The space after key is important so 'sc' doesn't match 'sclk'
                match = re.search(rf"{key}\s+([\d\.]+)\%", output)

                value = 0.0
                if match:
                    value = match.group(1)

                # Create the Prometheus metric lines
                metric_name = f"radeontop_{name}"
                response_lines.append(f"# HELP {metric_name} AMD FirePro Metric {key}")
                response_lines.append(f"# TYPE {metric_name} gauge")
                response_lines.append(f"{metric_name} {value}")

            # Send response
            response_text = "\n".join(response_lines)
            self.send_response(200)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            self.wfile.write(response_text.encode("utf-8"))

        except Exception as e:
            self.send_response(500)
            self.end_headers()
            print(f"Error: {e}")

if __name__ == "__main__":
    print("Starting Advanced AMD Bridge on port 9200...")
    HTTPServer(("0.0.0.0", 9200), MetricsHandler).serve_forever()