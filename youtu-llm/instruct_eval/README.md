## Guide to Reproduce Youtu-LLM Performance on General Benchmarks

### Introduction

We evaluated [Youtu-LLM-2B](https://huggingface.co/tencent/Youtu-LLM-2B) based on [evalscope](https://github.com/modelscope/evalscope.git) and [evalplus](https://github.com/evalplus/evalplus.git). To ensure accurate reproduction, please note the following:
- **Code Modifications:** We utilize patches to adjust the original evaluation code. These modifications primarily involve updates to **regular expression-based answer extraction** and the implementation of **multi-threaded processing** for improved efficiency.
- **Offline Datasets:** We strongly recommend downloading the offline datasets following the [evalscope guidelines](https://evalscope.readthedocs.io/en/latest/get_started/basic_usage.html#offline-evaluation) before running the evaluation on evalscope.

### Usage

#### Step 1: Prepare Evaluation Code

You need to download the specific versions of the evaluation tools and apply our custom patches.

**1. Update `evalscope`**

```bash
# Clone the repository
git clone https://github.com/modelscope/evalscope.git

# Navigate to the directory
cd evalscope

# Checkout the specific commit used for our evaluation
git checkout aa6a7e0727a470b932d02c41885580a324cdb2c4

# Apply the patch to update code
git apply ../patchs/update-evalscope.patch
```

**2. Update `evalplus`**

```bash
# Clone the repository
git clone https://github.com/evalplus/evalplus.git

# Navigate to the directory
cd evalplus

# Checkout the specific commit used for our evaluation
git checkout 13845c6f446f35cebbb123c5add72e841491c2c7

# Apply the patch to update code
git apply ../patchs/update-evalplus.patch
```

#### Step 2: Run Evaluation

##### Option A: Evalscope (For most general benchmarks)

**1. Environment Setting**

```bash
conda create -n evalscope python=3.10
conda activate evalscope
cd evalscope
pip install -e .
```

**2. Evaluation**

Before evaluation, you must start a **vllm_server** to host the model. Once the server is running, execute the following command:

```bash
python run_test_official.py <model_name> <outputs_dir> <api_url>
```

**Arguments:**
*   `<model_name>`: The model service name (the name used when serving the model).
*   `<outputs_dir>`: Directory to save the evaluation results.
*   `<api_url>`: The API URL of the vllm_server.

---

##### Option B: Evalplus (For HumanEval and MBPP benchmarks)

**1. Environment Setting**

```bash
conda create --name evalplus python==3.12
conda activate evalplus
cd evalplus
pip install -e '.[all]'
pip install func_timeout
```

**2. Evaluation**

Before evaluation, you must start a **vllm_server** to host the model. Once the server is running, execute the following command:

```bash
bash evalplus_run_test_official.sh <task> <model_name> <api_url>
```

**Arguments:**
*   `<task>`: The benchmark task (e.g., `humaneval`, `mbpp`).
*   `<model_name>`: The model service name (the name used when serving the model).
*   `<api_url>`: The API URL of the vllm_server.

### License

For the above evaluations, we obey [evalscope's default license](https://github.com/modelscope/evalscope/blob/main/LICENSE) and [evalplus's default license](https://github.com/evalplus/evalplus/blob/master/LICENSE).