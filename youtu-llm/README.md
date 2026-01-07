<div align="center">

# <img src="assets/logo.svg" alt="Tencent Youtu Lab Logo" height="26px"> Youtu-LLM: <br>Unlocking the Native Agentic Potential for Lightweight Large Language Models

[🔖 中文版](README_CN.md) • [🤗 Models](https://huggingface.co/collections/tencent/youtu) • [📑 Technical Report](https://arxiv.org/abs/2512.24618) • [⭐ Contributions](#contributions) • [📊 Benchmarks](#benchmarks) • [🚀 Getting Started](#quickstart)

</div>

## 🎯 Brief Introduction

**Youtu-LLM** is a new, small, yet powerful LLM, contains only 1.96B parameters, supports 128k long context, and has native agentic talents. On general evaluations, Youtu-LLM significantly outperforms SOTA LLMs of similar size in terms of Commonsense, STEM, Coding and Long Context capabilities; in agent-related testing, Youtu-LLM surpasses larger-sized leaders and is truly capable of completing multiple end2end agent tasks. 

**Youtu-LLM** has the following features:
- Type: Autoregressive Causal Language Models with Dense [MLA](https://arxiv.org/abs/2405.04434)
- Release versions: [Base](https://huggingface.co/tencent/Youtu-LLM-2B-Base) and [Instruct](https://huggingface.co/tencent/Youtu-LLM-2B)
- Number of Parameters: 1.96B
- Number of Layers: 32
- Number of Attention Heads (MLA): 16 for Q/K/V
- MLA Rank: 1,536 for Q, 512 for K/V 
- MLA Dim: 128 for QK Nope, 64 for QK Rope, and 128 for V
- Context Length: 131,072
- Vocabulary Size: 128,256

<a id="contributions"></a>

## 🚀 Contributions and Novelty

The key contributions of Youtu-LLM are as follows:
- 🎯 **STEM-Centric Design**: Youtu-LLM was STEM- and Agentic-centrically designed, encompassing its vocabulary fromation, data mixup and multi-stage curriculum learning.
- 💡 **Native Agentic Talents**: Youtu-LLM was natively trained with 128K long contexts + agentic mid-training, enabling more turns of interaction in on-device scenarios.
- ⚡ **SOTA Performance**: Youtu-LLM achieves SOTA performance on a small LLM based on the dense MLA architecture, surpassing conventional dense GQA/MHA paradigms. The MLA architecture also means that Youtu-LLM can be easily integrated into existing DSV3-oriented ecosystems.

<a id="benchmarks"></a>

## 📊 Performance Comparisons

### Base Model
#### General Benchmarks
| Type | Benchmark (Metric) | # Shots | Qwen3-1.7B-Base | SmoLM3-3B-Base | Gemma3-4B-Base | Qwen3-4B-Base | Llama3.1-8B | Youtu-LLM-2B-Base |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Commonsense  | MMLU-Pro (EM) | 5 | 34.9% | 35.3% | 29.4% | <u>46.1%</u> | 36.2% | **48.4%** |
|              | MLQA-Zh (EM) | 3 | 38.1% | 38.0% | 40.3% | **47.2%** | 43.0% | <u>43.5%</u> |
|              | MMLU-ProX-Zh (EM) | 5 | 32.5% | 26.7% | 24.2% | **45.2%** | 25.4% | <u>40.7%</u> |
| STEM         | GSM8K (EM) | 8 | 68.2% | 67.3% | 38.5% | **80.8%** | 47.8% | <u>77.6%</u> |
|              | MGSM-Zh (EM) | 8 | 57.1% | 40.7% | 33.0% | **69.7%** | 35.9% | <u>68.9%</u> |
|              | MATH (EM) | 4 | 28.1% | 40.8% | 24.4% | **44.8%** | 21.5% | <u>44.4%</u> |
|              | BBH (EM) | 3 | 53.0% | 59.8% | 51.6% | **70.8%** | <u>62.9%</u> | 59.8% |
|              | GPQA-MC (Acc. Norm) | 5 | 30.4% | 26.6% | 28.6% | **37.8%** | 30.1% | <u>33.3%</u> |
|              | HLE-MC (Acc. Norm) | 3 | 10.7% | 3.1% | 8.0% | <u>15.0%</u> | 11.5% | **17.4%** |
| Coding       | MBPP (Pass@1) | 3 | 55.6% | 51.0% | 45.8% | **67.5%** | 49.4% | <u>66.6%</u> |
|              | MBPP+ (Pass@1) | 3 | 71.0% | 66.1% | 61.9% | <u>80.8%</u> | 62.7% | **81.8%** |
|              | HumanEval (Pass@1) | 0 | 49.9% | 34.8% | 36.6% | <u>57.6%</u> | 36.0% | **64.6%** |
|              | HumanEval+ (Pass@1) | 0 | 41.3% | 28.1% | 28.1% | <u>49.9%</u> | 28.1% | **57.3%** |
|              | LiveCodeBench v6 (Pass@1) | 3 | 5.1% | 2.9% | 2.9% | <u>6.9%</u> | 3.4% | **9.7%** |
|              | CRUXEval (Pass@1) | 1 | 40.6% | 42.1% | 39.7% | <u>54.8%</u> | 42.3% | **55.9%** |
|              | RepoBench (EM) | 3 | 21.0% | 21.8% | 23.0% | **25.3%** | <u>25.2%</u> | 22.7% |
| Long Context | LongBench v2 (Acc.) | 3 | <u>28.0%</u> | **28.8%** | 26.6% | 25.8% | 27.8% | 27.2% |
|              | NIAH (Acc.) | / | 79.8% | 75.0% | <u>99.5%</u> | 83.0% | **99.8%** | 98.8% |

#### Agentic Benchmarks
We takes [APTBench](https://github.com/TencentYoutuResearch/APTBench/) for evaluating the agentic capabilities of base model.

| Category | Qwen3-1.7B-Base | SmoLM3-3B-Base | Gemma3-4B-Base | Qwen3-4B-Base | Llama3.1-8B | Youtu-LLM-2B-Base |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Code | 25.1% | 24.3% | 32.8% | **41.9%** | 23.6% | <u>37.9%</u> |
| Deep Research | 28.5% | 27.2% | 36.4% | **40.5%** | 30.0% | <u>38.6%</u> |
| Math | 59.9% | 60.7% | 59.8% | **70.5%** | 60.1% | <u>68.0%</u> |
| Tool | 56.7% | 59.1% | 61.7% | **65.8%** | 64.1% | <u>64.2%</u> |

### Instruct Model
#### General Benchmarks
| Benchmark | DeepSeek-R1-Distill-Qwen-1.5B | Qwen3-1.7B | SmolLM3-3B | Qwen3-4B | DeepSeek-R1-Distill-Llama-8B | Youtu-LLM-2B |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Commonsense Knowledge Reasoning** | | | | | | |
| MMLU-Redux | 53.0% | 74.1% | 75.6% | **83.8%** | <u>78.1%</u> | 75.8% |
| MMLU-Pro | 36.5% | 54.9% | 53.0% | **69.1%** | 57.5% | <u>61.6%</u> |
| **Instruction Following & Text Reasoning** | | | | | | |
| IFEval | 29.4% | 70.4% | 60.4% | **83.6%** | 34.6% | <u>81.2%</u> |
| DROP | 41.3% | 72.5% | 72.0% | <u>82.9%<u> | 73.1% | **86.7%** |
| MUSR | 43.8% | 56.6% | 54.1% | **60.5%** | <u>59.7%</u> | 57.4% |
| **STEM** | | | | | | |
| MATH-500 | 84.8% | 89.8% | 91.8% | **95.0%** | 90.8% | <u>93.7%</u> |
| AIME 24 | 30.2% | 44.2% | 46.7% | **73.3%** | 52.5% | <u>65.4%</u> |
| AIME 25 | 23.1% | 37.1% | 34.2% | **64.2%** | 34.4% | <u>49.8%</u> |
| GPQA-Diamond | 33.6% | 36.9% | 43.8% | **55.2%** | 45.5% | <u>48.0%</u> |
| BBH | 31.0% | 69.1% | 76.3% | **87.8%** | <u>77.8%</u> | 77.5% |
| **Coding** | | | | | | |
| HumanEval | 64.0% | 84.8% | 79.9% | <u>95.4%<u> | 88.1% | **95.9%** |
| HumanEval+ | 59.5% | 76.2% | 74.7% | <u>87.8%</u> | 82.5% | **89.0%** |
| MBPP | 51.5% | 80.5% | 66.7% | **92.3%** | 73.9% | <u>85.0%</u> |
| MBPP+ | 44.2% | 67.7% | 56.7% | **77.6%** | 61.0% | <u>71.7%</u> |
| LiveCodeBench v6 | 19.8% | 30.7% | 30.8% | **48.5%** | 36.8% | <u>43.7%</u> |

#### Agentic Benchmarks
| Benchmark | Qwen3-1.7B | SmolLM3-3B | Qwen3-4B | Youtu-LLM-2B |
| :--- | :---: | :---: | :---: | :---: |
| **Deep Research** | | | | |
| GAIA | 11.4% | 11.7% | <u>25.5%</u> | **33.9%** |
| xbench | 11.7% | 13.9% | <u>18.4%</u> | **19.5%** |
| **Code** | | | | |
| SWE-Bench-Verified | 0.6% | <u>7.2%</u> | 5.7% | **17.7%** |
| EnConda-Bench | 10.8% | 3.5% | <u>16.1%</u> | **21.5%** |
| **Tool** | | | | |
| BFCL V3 | 55.5% | 31.5% | **61.7%** | <u>58.0%</u> |
| τ²-Bench | 2.6% | 9.7% | <u>10.9%</u> | **15.0%** |

## 📁 Reproduce Evaluations

We provide our evaluation codes for reproducing the above scores. 
- For [Youtu-LLM-2B-Base](https://huggingface.co/tencent/Youtu-LLM-2B-Base), all short general benchmarks can be evaluated with [base_eval](base_eval/), and agentic metrics can be obtained with [APTBench](https://github.com/TencentYoutuResearch/APTBench/).
- For [Youtu-LLM-2B](https://huggingface.co/tencent/Youtu-LLM-2B), all benchmarks can be evaluated with [instruct_eval](instruct_eval/).

<a id="quickstart"></a>

## 🚀 Quick Start
This guide will help you quickly deploy and invoke the **Youtu-LLM-2B** model. This model supports "Reasoning Mode", enabling it to generate higher-quality responses through Chain of Thought (CoT).

### 1. Environment Preparation

Ensure your Python environment has the `transformers` library installed and that the version meets the requirements.

```bash
pip install "transformers>=4.56.0,<=4.57.1" torch accelerate

```
> **Note**
> - (1) We recommend to limit the version of transformers: pip install "transformers>=4.56.0,<=4.57.1", which is comparable with the current remote codes;
> - (2) Do not use transformers==4.57.2, since there is a [bug unfixed](https://github.com/huggingface/transformers/issues/42395);
> - (3) If you would like to maintain a higher version (e.g., 4.57.3), you should slightly modify the "[check_model_inputs](https://huggingface.co/tencent/Youtu-LLM-2B/blob/main/modeling_youtu.py#L474)" in modeling_youtu.py to "check_model_inputs()", following the [patch](https://github.com/huggingface/transformers/commit/ede92a8755e48da7ae1d1b7d976ad581aa5c8327#diff-00deeb775525887b5d4f029e8084dd85737e561d4e2606ec8b4787f55d6cf286).

### 2. Core Code Example

The following example demonstrates how to load the model, enable Reasoning Mode, and use the `re` module to parse the "Thought Process" and the "Final Answer" from the output.

```python
import re
from transformers import AutoTokenizer, AutoModelForCausalLM

# 1. Configure Model
model_id = "tencent/Youtu-LLM-2B"

# 2. Initialize Tokenizer and Model
tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    device_map="auto",
    trust_remote_code=True
)

# 3. Construct Dialogue Input
prompt = "Hello"
messages = [{"role": "user", "content": prompt}]

# Use apply_chat_template to construct input; set enable_thinking=True to activate Reasoning Mode
input_text = tokenizer.apply_chat_template(
    messages,
    tokenize=False,
    add_generation_prompt=True,
    enable_thinking=True
)

model_inputs = tokenizer([input_text], return_tensors="pt").to(model.device)
print("Input prepared. Starting generation...")

# 4. Generate Response
outputs = model.generate(
    **model_inputs,
    max_new_tokens=512,
    do_sample=True,
    temperature=1.0,
    top_k=20,
    top_p=0.95,
    repetition_penalty=1.05
)
print("Generation complete!")

# 5. Parse Results
full_response = tokenizer.decode(outputs[0], skip_special_tokens=True)

def parse_reasoning(text):
    """Extract thought process within <think> tags and the subsequent answer content"""
    thought_pattern = r"<think>(.*?)</think>"
    match = re.search(thought_pattern, text, re.DOTALL)
    
    if match:
        thought = match.group(1).strip()
        answer = text.split("</think>")[-1].strip()
    else:
        thought = "(No explicit thought process generated)"
        answer = text
    return thought, answer

thought, final_answer = parse_reasoning(full_response)

print(f"\n{'='*20} Thought Process {'='*20}\n{thought}")
print(f"\n{'='*20} Final Answer {'='*20}\n{final_answer}")
```

### 3. Key Configuration Details

#### Reasoning Mode Toggle

Controlled via the `enable_thinking` parameter in the `apply_chat_template` method:

* **True (Recommended Default):** Activates Chain of Thought; ideal for complex logic and reasoning tasks.
* **False:** Outputs results directly; faster response time, suitable for simple conversations.

#### Recommended Decoding Parameters

Depending on your use case, we suggest adjusting the following hyperparameters for optimal generation:

| Parameter | Reasoning Mode | Normal Mode |
| --- | --- | --- |
| `do_sample` | `True` | `True` |
| `temperature` | **1.0** (Maintains creativity) | **0.7** (More stable results) |
| `top_p` | 0.95 | 0.8 |
| `top_k` | 20 | 20 |
| `repetition_penalty` | 1.05 | - |

> **Tip:** When using Reasoning Mode, a higher `temperature` helps the model perform deeper, more divergent thinking.

### 4. vLLM Deployment

We provide support for deploying the model using **vLLM 0.10.2**. The recommended Docker image is `vllm/vllm-openai:v0.10.2`.

#### Integration Steps
First, execute the following commands to integrate the Youtu-LLM model files into the vLLM framework.
*Note: Please extract our provided [modified vllm zip file](vllm_deploy/modified_vllm.zip) first. Then, replace `<local_modified_vllm_path>` with the path to the extracted vllm directory, and replace `<vllm_path>` with the installation path of vLLM.*

```bash
cp <local_modified_vllm_path>/0_10_2_official/youtu_llm.py <vllm_path>/vllm/model_executor/models/youtu_llm.py
cp <local_modified_vllm_path>/0_10_2_official/configuration_youtu.py <vllm_path>/vllm/model_executor/models/configuration_youtu.py
cp <local_modified_vllm_path>/0_10_2_official/__init__.py <vllm_path>/vllm/config/__init__.py
cp <local_modified_vllm_path>/0_10_2_official/registry.py <vllm_path>/vllm/model_executor/models/registry.py
```

#### Service Startup
Once integrated, you can deploy the model using the following command:

```bash
vllm serve <model_path> --trust-remote-code
```

**Tool Call Support:**
To enable tool calling capabilities, please append the following arguments to the startup command:

```bash
--enable-auto-tool-choice --tool-call-parser hermes
```

## 📚 Citation

If you find this work useful, please consider citing:

```bibtex
@article{youtu-llm,
  title={Youtu-LLM: Unlocking the Native Agentic Potential for Lightweight Large Language Models},
  author={Tencent Youtu Lab},
  year={2025},
  eprint={2512.24618},
  archivePrefix={arXiv},
  primaryClass={cs.CL},
  url={https://arxiv.org/abs/2512.24618}, 
}
```
