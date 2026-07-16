import urllib.request
import xml.etree.ElementTree as ET

def test_traffic():
    url = "http://192.168.1.1/api/monitoring/traffic-statistics"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            download_rate = int(root.findtext('CurrentDownloadRate', '0'))
            upload_rate = int(root.findtext('CurrentUploadRate', '0'))
            print(f"Download: {download_rate} B/s")
            print(f"Upload: {upload_rate} B/s")
    except Exception as e:
        print(f"Error: {e}")

test_traffic()
