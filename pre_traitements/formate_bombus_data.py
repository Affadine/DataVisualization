import pandas as pd


if __name__ == "__main__":
    dataset_url = 'http://www.atlashymenoptera.net/services/getdataset.ashx?id=6323&pg_id=169'
    dataset = pd.read_csv(dataset_url)
    print(dataset)