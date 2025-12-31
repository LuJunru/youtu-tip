## Guide to reproduce Youtu-llm's performance over general benchmarks

### Intro
We evaluated [Youtu-LLM-2B-Base]((https://huggingface.co/tencent/Youtu-LLM-2B-Base)) based on [v0.4.9.1 of lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness/releases/tag/v0.4.9.1). Here, we provide a task set to reproduce the evaluation. 
- The major difference between our task set and the offical task set is we include several unsupported new tasks (e.g., RepoBench, CRUXeval).
- It is recommended to use transformers==4.56.0 when evaluate Youtu-LLM-2B-Base. In fact, we suggest to use most adjacent version of transformers in each model's config.
- The python version in our evaluation is 3.10.9.

### Usage
#### Step1: set environment
```
# Download source code of lm-evaluation-harness
curl -LJO https://github.com/EleutherAI/lm-evaluation-harness/archive/refs/tags/v0.4.9.1.zip
unzip lm-evaluation-harness-0.4.9.1.zip

# replace the original task set with our task set
mv lm-evaluation-harness-0.4.9.1/lm_eval/tasks/ lm-evaluation-harness-0.4.9.1/lm_eval/tasks-raw/
unzip tasks.zip
mv tasks/ lm-evaluation-harness-0.4.9.1/lm_eval/
```

#### Step2: running evaluation
```
export HF_DATASETS_OFFLINE=1
export HF_ALLOW_CODE_EVAL=1

root="Your root path"
cd ${root}/lm-evaluation-harness-0.4.9.1/ && pip3 install -e .
pip3 install transformers==4.56.0

KEY=$1
models=("${KEY}")
seeds=(1234 42 2025 1024)
output_path=${root}/outputs

if [[ ! -d ${output_path} ]]
then
    mkdir ${output_path}
fi

# Commonsense Benchmarks
cs_datasets=("mmlu_pro" "mlqa_zh_zh" "mmlu_prox_zh")
for cs_dataset in "${cs_datasets[@]}"
    do
    FSHOT=3
    BS="auto"
    case ${cs_dataset} in 
        "mmlu_prox_zh" | "mmlu_pro")
            FSHOT=5
            ;;
    esac
    for seed in "${seeds[@]}"
        do
        for model in "${models[@]}"
            do
            AFILE=${root}/outputs/$(basename ${model})/${cs_dataset}
            accelerate launch -m lm_eval \
                --model hf \
                --model_args pretrained=${model},dtype=auto,trust_remote_code=true,attn_implementation=flash_attention_2,max_length=4096 \
                --tasks ${cs_dataset} \
                --batch_size ${BS} \
                --output_path ${AFILE} \
                --num_fewshot ${FSHOT} \
                --log_samples \
                --seed ${seed} \
                --gen_kwargs max_gen_toks=1024 \
                --device cuda
            done
        done
    done


# STEM Benchmarks
stem_datasets=("gsm8k" "mgsm_native_cot_zh" "minerva_math" "bbh_cot_fewshot" "leaderboard_gpqa_main" "hle_mc")
for stem_dataset in "${stem_datasets[@]}"
    do
    FSHOT=3
    BS="auto"
    case ${stem_dataset} in 
        "gsm8k" | "mgsm_native_cot_zh")
            FSHOT=8
            ;;
        "mmlu_pro" | "leaderboard_gpqa_main")
            FSHOT=5
            ;;
        "minerva_math")
            pip3 install --upgrade antlr4-python3-runtime==4.11 -i https://mirrors.cloud.tencent.com/pypi/simple
            FSHOT=4
            ;;
    esac
    for seed in "${seeds[@]}"
        do
        for model in "${models[@]}"
            do
            AFILE=${root}/outputs/$(basename ${model})/${stem_dataset}
            accelerate launch -m lm_eval \
                --model hf \
                --model_args pretrained=${model},dtype=auto,trust_remote_code=true,attn_implementation=flash_attention_2,max_length=4096 \
                --tasks ${stem_dataset} \
                --batch_size ${BS} \
                --output_path ${AFILE} \
                --num_fewshot ${FSHOT} \
                --log_samples \
                --seed ${seed} \
                --gen_kwargs max_gen_toks=1024 \
                --device cuda
            done
        done
    done

# Coding Benchmarks
co_datasets=("mbpp" "mbpp_plus" "humaneval" "humaneval_plus" "livecodebench_v6" "cruxeval" "repobench")
for co_dataset in "${co_datasets[@]}"
    do
    FSHOT=3
    BS="auto"
    case ${co_dataset} in 
        "humaneval" | "humaneval_plus")
            FSHOT=0
            ;;
        "repobench")
            pip3 install --upgrade fuzzywuzzy codebleu -i https://mirrors.cloud.tencent.com/pypi/simple
            ;;
    esac
    for seed in "${seeds[@]}"
        do
        for model in "${models[@]}"
            do
            AFILE=${root}/outputs/$(basename ${model})/${co_dataset}
            accelerate launch -m lm_eval \
                --model hf \
                --model_args pretrained=${model},dtype=auto,trust_remote_code=true,attn_implementation=flash_attention_2,max_length=4096 \
                --tasks ${co_dataset} \
                --batch_size ${BS} \
                --output_path ${AFILE} \
                --num_fewshot ${FSHOT} \
                --log_samples \
                --seed ${seed} \
                --gen_kwargs max_gen_toks=1024 \
                --confirm_run_unsafe_code \
                --device cuda
            done
        done
    done
```

### License
For the above evaluations, we obey [lm-evaluation-harness's default license](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/LICENSE.md).
