import subprocess, sys, os, json
from java.lang import System

def execute_command(cmd):
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    out, err = p.communicate()
    rc = p.returncode
    out = out.decode("utf-8", "replace")
    if rc != 0:
        print("Error executing:", cmd)
        print(err.decode("utf-8", "replace"))
        sys.exit(1)
    return out.splitlines()


def mq_field_splitter(field):
    if "(" not in field or ")" not in field:
        return "", "", False
    key = field.split("(", 1)[0]
    value = field.split("(", 1)[1].rstrip(")")
    return key, value.replace("'", "").replace('"', ''), True


def parse_object(total_output, line, objtype):
    result = {}
    fields = line.split()
    for f in fields:
        k, v, s = mq_field_splitter(f)
        if s:
            result[k] = v
    name = result.get(objtype)
    if name:
        total_output[objtype][name] = result


def main():
    coll_home = System.getProperty("com.collation.home")
    plugins = coll_home + "/osgi/plugins"

    jython_home = ""
    for f in os.listdir(plugins):
        if "jython" in f:
            jython_home = plugins + "/" + f + "/lib"

    sys.path.append(jython_home + "/Lib")
    sys.prefix = jython_home + "/Lib"

    total_output = {
        "QLOCAL": {}, "QALIAS": {}, "QREMOTE": {}, "CHANNEL": {}
    }

    dspmq_output = execute_command(["/opt/mqm/bin/dspmq"])
    total_output["name"] = dspmq_output[0].split("(")[1].split(")")[0]

    dmpmqcfg_output = execute_command([
        "/usr/bin/sudo", "-u", "mqm",
        "/opt/mqm/bin/dmpmqcfg", "-o", "1line", "-a"
    ])

    for line in dmpmqcfg_output:
        if not line or line.startswith("*"):
            continue
        if line.startswith("DEFINE QLOCAL"):
            parse_object(total_output, line, "QLOCAL")
        elif line.startswith("DEFINE QALIAS"):
            parse_object(total_output, line, "QALIAS")
        elif line.startswith("DEFINE QREMOTE"):
            parse_object(total_output, line, "QREMOTE")
        elif line.startswith("DEFINE CHANNEL"):
            parse_object(total_output, line, "CHANNEL")

    print json.dumps(total_output)


if __name__ == "__main__":
    main()