import re
LOG_FILE = "/tmp/iftop.log"
TRANSFERRED_LIMIT = 5 # in megabytes

SCRIPT_PATH = "/tmp/block-ips.sh"

def main():
    iptables_cmd = "#!/bin/bash\n\n"

    with open(LOG_FILE, 'r') as f:
        lines = f.readlines()
        line_no = 0

        while(line_no < len(lines)):
            line = lines[line_no]
            result = re.search(r"^\d{1,}\s(\d{1,}(?:.\d{1,})?)(\w{1,2})", line, re.MULTILINE) # eg. 1 45.2MB
            transferred = None

            if result:
                transferred = result.group(1) # 45.2

                if result.group(2) == "MB" or result.group(2) == "GB" and int(transferred) > TRANSFERRED_LIMIT:
                    # skip to next line to get IP address
                    # Ip source is a reflection attack, blacklist it
                    line_no += 1
                    next_line = lines[line_no]
                    result = re.search(r"((?:[0-9]{1,3}\.){3}[0-9]{1,3})\:((?:\d{1,})|(?:https))\s", next_line, re.MULTILINE) # eg. 154.161.177.105:38325 5.09KB; 52.92.133.226:https 70.3KB

                    if result:
                        ip = result.group(1)
                        if ip != "94.130.76.196":
                            iptables_cmd += f"sudo fail2ban-client set manualban banip {ip}\n"

            line_no += 1

    with open(SCRIPT_PATH, 'w') as f:
        f.writelines(iptables_cmd)


if __name__ == "__main__":
    main()
