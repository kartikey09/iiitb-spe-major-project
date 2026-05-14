#!/bin/bash

# 1. Map Dummy User Namespaces
useradd -r isolate 2>/dev/null || true
echo "isolate:100000:65536" >> /etc/subuid
echo "isolate:100000:65536" >> /etc/subgid
echo "root:100000:65536" >> /etc/subuid
echo "root:100000:65536" >> /etc/subgid

# 2. The Cgroup Shuffle (Evacuate ALL processes from root)
mkdir -p /sys/fs/cgroup/init
while read -r pid; do
    echo "$pid" > /sys/fs/cgroup/init/cgroup.procs 2>/dev/null || true
done < /sys/fs/cgroup/cgroup.procs

# 3. Create Sandbox Cgroup & Enable Controllers
mkdir -p /sys/fs/cgroup/isolate-cg
for ctrl in cpu memory pids cpuset; do 
    echo "+$ctrl" > /sys/fs/cgroup/cgroup.subtree_control 2>/dev/null
    echo "+$ctrl" > /sys/fs/cgroup/isolate-cg/cgroup.subtree_control 2>/dev/null
done

# 4. Map Isolate to the Sandbox Cgroup
mkdir -p /run/isolate
echo "/sys/fs/cgroup/isolate-cg" > /run/isolate/cgroup

echo "Sandbox Environment Ready!"

# Start the Kafka judge worker
exec ./worker